import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  prepareCompanyInfoForEmbedding, 
  storeCompanyBrainWithEmbedding,
  storeAdditionalContext,
  searchSimilarContent
} from '@/lib/embeddings';
import type { CompanyBrain, BrainDocument, DocumentGroup } from '@/types';

interface BrainPageProps {
  onBack: () => void;
}

export default function BrainPage({ onBack }: BrainPageProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'search'>('info');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  // Company Brain State
  const [companyBrain, setCompanyBrain] = useState<Partial<CompanyBrain>>({
    company_name: '',
    tagline: '',
    company_description: '',
    industry: '',
    founded_year: undefined,
    company_size: '',
    location: '',
    website: '',
    email: '',
    phone: '',
    mission_statement: '',
    vision_statement: '',
    core_values: [],
    unique_selling_points: [],
    target_audience: '',
    pricing_model: '',
    key_features: [],
    founder_info: '',
    additional_context: ''
  });
  
  // Documents State
  const [documents, setDocuments] = useState<BrainDocument[]>([]);
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  async function initializeUser() {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated && data.admin) {
        setUserId(data.admin.id);
        await loadCompanyBrain(data.admin.id);
        await loadDocuments(data.admin.id);
        await loadGroups(data.admin.id);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  }

  async function loadCompanyBrain(uid: string) {
    try {
      const { data, error } = await supabase
        .from('company_brain')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setCompanyBrain(data);
    } catch (error) {
      console.error('Error loading company brain:', error);
    }
  }

  async function loadDocuments(uid: string) {
    try {
      const { data, error } = await supabase
        .from('brain_documents')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  async function loadGroups(uid: string) {
    try {
      const { data, error } = await supabase
        .from('document_groups')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }

  async function handleSave() {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Save company brain with embedding
      const result = await storeCompanyBrainWithEmbedding(
        supabase,
        userId,
        companyBrain
      );

      if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
      }

      // Save additional context if provided
      if (companyBrain.additional_context && result.brainId) {
        const contextResult = await storeAdditionalContext(
          supabase,
          userId,
          result.brainId,
          companyBrain.additional_context
        );

        if (contextResult.success) {
          alert(`Saved successfully! Generated ${contextResult.chunksProcessed || 0} context chunks.`);
        }
      } else {
        alert('Company Brain saved successfully!');
      }

      await loadCompanyBrain(userId);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving company brain');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !userId) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('brain-documents')
          .upload(`${userId}/${fileName}`, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('brain-documents')
          .getPublicUrl(uploadData.path);

        // Determine file type
        let fileType: BrainDocument['file_type'] = 'other';
        if (file.type.includes('pdf')) fileType = 'pdf';
        else if (file.type.includes('image')) fileType = 'image';
        else if (file.type.includes('video')) fileType = 'video';
        else if (file.type.includes('audio')) fileType = 'audio';
        else if (file.type.includes('document') || file.type.includes('text')) fileType = 'document';

        // Insert document record
        const { data: docData, error: docError } = await supabase
          .from('brain_documents')
          .insert({
            user_id: userId,
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            mime_type: file.type,
            storage_path: uploadData.path,
            storage_url: urlData.publicUrl,
            status: 'uploaded'
          })
          .select()
          .single();

        if (docError) throw docError;

        // Generate embedding for document
        const content = `File: ${file.name}\nType: ${fileType}`;
        const embeddingResult = await import('@/lib/embeddings').then(m => m.generateEmbedding(content));
        
        if (!embeddingResult.error) {
          await supabase
            .from('company_brain_embeddings')
            .insert({
              user_id: userId,
              content_type: 'document',
              content_id: docData.id,
              content: content,
              embedding: embeddingResult.embedding,
              metadata: {
                file_name: file.name,
                file_type: fileType
              }
            });
        }
      }

      alert('Files uploaded successfully!');
      await loadDocuments(userId);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files');
    } finally {
      setUploading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery || !userId) return;

    setSearching(true);
    try {
      const results = await searchSimilarContent(
        supabase,
        userId,
        searchQuery,
        0.75, // Lower threshold for more results
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

  function handleArrayInput(field: 'core_values' | 'unique_selling_points' | 'key_features', value: string) {
    const array = value.split(',').map(s => s.trim()).filter(Boolean);
    setCompanyBrain(prev => ({ ...prev, [field]: array }));
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
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Company Brain</h1>
            <p className="text-gray-600 mt-2">
              Store and manage your company-wide knowledge with semantic search
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'info' as const, label: 'Company Info' },
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
            {/* Company Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyBrain.company_name || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={companyBrain.industry || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={companyBrain.tagline || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, tagline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Your company's tagline or slogan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Description
                  </label>
                  <textarea
                    value={companyBrain.company_description || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, company_description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Founded Year
                    </label>
                    <input
                      type="number"
                      value={companyBrain.founded_year || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, founded_year: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="2020"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size
                    </label>
                    <input
                      type="text"
                      value={companyBrain.company_size || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, company_size: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="1-10, 11-50, 51-200, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={companyBrain.location || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={companyBrain.website || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={companyBrain.email || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="info@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={companyBrain.phone || ''}
                      onChange={(e) => setCompanyBrain(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mission Statement
                  </label>
                  <textarea
                    value={companyBrain.mission_statement || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, mission_statement: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vision Statement
                  </label>
                  <textarea
                    value={companyBrain.vision_statement || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, vision_statement: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Core Values (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={companyBrain.core_values?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('core_values', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Innovation, Integrity, Excellence"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unique Selling Points (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={companyBrain.unique_selling_points?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('unique_selling_points', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="24/7 Support, AI-Powered, Cloud-Native"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={companyBrain.target_audience || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, target_audience: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pricing Model
                  </label>
                  <input
                    type="text"
                    value={companyBrain.pricing_model || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, pricing_model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Subscription, One-time, Freemium, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Features (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={companyBrain.key_features?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('key_features', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Real-time Analytics, API Access, Custom Integrations"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Founder Information
                  </label>
                  <textarea
                    value={companyBrain.founder_info || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, founder_info: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Information about founders and their background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Context
                  </label>
                  <textarea
                    value={companyBrain.additional_context || ''}
                    onChange={(e) => setCompanyBrain(prev => ({ ...prev, additional_context: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Add any additional information about your company that should be searchable..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This text will be chunked and embedded for semantic search
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save & Generate Embeddings'}
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
                    {uploading ? 'Uploading...' : 'Click to upload documents'}
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF, images, documents, videos, audio files accepted
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Uploaded Documents ({documents.length})
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
                              <h4 className="font-medium text-gray-900">{doc.file_name}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="px-2 py-1 bg-gray-100 rounded">{doc.file_type}</span>
                                <span>{(doc.file_size || 0 / 1024).toFixed(2)} KB</span>
                                <span>{doc.status}</span>
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
                    Search Query
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="What is our mission statement?"
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
                    Use natural language to search your company knowledge base
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
                            {JSON.stringify(result.metadata, null, 2)}
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
