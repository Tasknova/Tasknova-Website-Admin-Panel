import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  prepareProjectMetadataForEmbedding,
  storeProjectMetadataWithEmbedding,
  generateProjectDocumentEmbedding,
  searchProjectContent
} from '@/lib/projectEmbeddings';
import type { Project, ProjectMetadata, ProjectDocument } from '@/types';

interface ProjectBrainPageProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectBrainPage({ projectId, onBack }: ProjectBrainPageProps) {
  const [activeTab, setActiveTab] = useState<'metadata' | 'documents' | 'search'>('metadata');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  // Project State
  const [project, setProject] = useState<Project | null>(null);
  const [metadata, setMetadata] = useState<Partial<ProjectMetadata>>({
    domain: '',
    industry: '',
    project_type: '',
    target_audience: '',
    tech_stack: [],
    requirements: '',
    key_goals: [],
    budget_range: '',
    priority_level: 'medium',
    pricing_information: '',
    additional_context: ''
  });
  
  // Documents State
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    initializeProject();
  }, [projectId]);

  async function initializeProject() {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated && data.admin) {
        setUserId(data.admin.id);
        await loadProject();
        await loadMetadata();
        await loadDocuments();
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  }

  async function loadProject() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    }
  }

  async function loadMetadata() {
    try {
      const { data, error } = await supabase
        .from('project_metadata')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setMetadata(data);
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  }

  async function loadDocuments() {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  async function handleSaveMetadata() {
    if (!userId || !project) return;
    
    setLoading(true);
    try {
      const result = await storeProjectMetadataWithEmbedding(
        supabase,
        projectId,
        project.company_id,
        project.project_name,
        metadata
      );

      if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Project metadata saved successfully!');
      await loadMetadata();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving project metadata');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !userId || !project) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(`${projectId}/${fileName}`, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('project-documents')
          .getPublicUrl(uploadData.path);

        // Determine file type
        let fileType: ProjectDocument['file_type'] = 'other';
        if (file.type.includes('pdf')) fileType = 'pdf';
        else if (file.type.includes('image')) fileType = 'image';
        else if (file.type.includes('video')) fileType = 'video';
        else if (file.type.includes('audio')) fileType = 'audio';
        else if (file.type.includes('document') || file.type.includes('text')) fileType = 'document';

        // Insert document record
        const { data: docData, error: docError } = await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            company_id: project.company_id,
            uploaded_by: userId,
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            mime_type: file.type,
            storage_path: uploadData.path,
            storage_url: urlData.publicUrl,
            status: 'uploaded',
            is_deleted: false
          })
          .select()
          .single();

        if (docError) throw docError;

        // Generate embedding for document using Edge Function
        await generateProjectDocumentEmbedding(
          supabase,
          projectId,
          project.company_id,
          docData.id
        );
      }

      alert('Files uploaded successfully!');
      await loadDocuments();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files');
    } finally {
      setUploading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery) return;

    setSearching(true);
    try {
      const results = await searchProjectContent(
        supabase,
        projectId,
        searchQuery,
        0.75,
        10
      );

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error performing search');
    } finally {
      setSearching(false);
    }
  }

  function handleArrayInput(field: 'tech_stack' | 'key_goals', value: string) {
    const array = value.split(',').map(s => s.trim()).filter(Boolean);
    setMetadata(prev => ({ ...prev, [field]: array }));
  }

  if (!project) {
    return <div className="p-8">Loading project...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
            >
              ← Back to Project
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{project.project_name} - Brain</h1>
            <p className="text-gray-600 mt-2">
              Store and manage project-specific knowledge with semantic search
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'metadata' as const, label: 'Project Metadata' },
                { id: 'documents' as const, label: 'Documents' },
                { id: 'search' as const, label: 'Search' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Metadata Tab */}
            {activeTab === 'metadata' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={metadata.domain || ''}
                      onChange={(e) => setMetadata(prev => ({ ...prev, domain: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Healthcare, Finance"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={metadata.industry || ''}
                      onChange={(e) => setMetadata(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type
                    </label>
                    <input
                      type="text"
                      value={metadata.project_type || ''}
                      onChange={(e) => setMetadata(prev => ({ ...prev, project_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Web App, Mobile App"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Range
                    </label>
                    <input
                      type="text"
                      value={metadata.budget_range || ''}
                      onChange={(e) => setMetadata(prev => ({ ...prev, budget_range: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., $50k-$100k"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={metadata.target_audience || ''}
                    onChange={(e) => setMetadata(prev => ({ ...prev, target_audience: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tech Stack (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={metadata.tech_stack?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('tech_stack', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="React, Node.js, PostgreSQL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Goals (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={metadata.key_goals?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('key_goals', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Improve performance, Reduce costs, Increase engagement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements
                  </label>
                  <textarea
                    value={metadata.requirements || ''}
                    onChange={(e) => setMetadata(prev => ({ ...prev, requirements: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pricing Information
                  </label>
                  <textarea
                    value={metadata.pricing_information || ''}
                    onChange={(e) => setMetadata(prev => ({ ...prev, pricing_information: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Details about pricing model, tiers, packages..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Context
                  </label>
                  <textarea
                    value={metadata.additional_context || ''}
                    onChange={(e) => setMetadata(prev => ({ ...prev, additional_context: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Add any additional project information that should be searchable..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={metadata.priority_level || 'medium'}
                    onChange={(e) => setMetadata(prev => ({ ...prev, priority_level: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveMetadata}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Metadata & Generate Embeddings'}
                  </button>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700"
                  >
                    {uploading ? 'Uploading...' : 'Click to upload project documents'}
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Upload requirements, designs, specs, or any project-related files
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Project Documents ({documents.length})
                  </h3>
                  
                  {documents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No documents uploaded yet</p>
                  ) : (
                    <div className="grid gap-4">
                      {documents.map(doc => (
                        <div
                          key={doc.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {doc.title || doc.file_name}
                              </h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="px-2 py-1 bg-gray-100 rounded">{doc.file_type}</span>
                                <span>{((doc.file_size || 0) / 1024).toFixed(2)} KB</span>
                                {doc.category && <span>Category: {doc.category}</span>}
                              </div>
                              {doc.description && (
                                <p className="text-sm text-gray-600 mt-2">{doc.description}</p>
                              )}
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {doc.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {doc.storage_url && (
                              <a
                                href={doc.storage_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Project Knowledge
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="What are the technical requirements?"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchQuery}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Search through project metadata and documents using natural language
                  </p>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Search Results ({searchResults.length})
                    </h3>
                    
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            {result.content_type}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            {(result.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{result.content}</p>
                        {result.metadata && (
                          <div className="mt-2 text-xs text-gray-500">
                            {result.metadata.file_name && (
                              <span className="font-medium">Source: {result.metadata.file_name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No results found. Try a different query.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
