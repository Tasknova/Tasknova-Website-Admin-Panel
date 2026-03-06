// Utility functions for Project Brain vector embeddings with Google Gemini

import { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings';

export interface ProjectMetadata {
  id?: string;
  project_id?: string;
  company_id?: string;
  domain?: string;
  industry?: string;
  project_type?: string;
  target_audience?: string;
  tech_stack?: string[];
  requirements?: string;
  key_goals?: string[];
  milestones?: any;
  team_size?: number;
  budget_range?: string;
  priority_level?: string;
  pricing_information?: string;
  custom_fields?: Record<string, any>;
  additional_context?: string;
  [key: string]: any;
}

/**
 * Prepare project metadata for embedding
 * @param metadata - Project metadata object
 * @param projectName - Project name
 * @returns Formatted text for embedding
 */
export function prepareProjectMetadataForEmbedding(
  metadata: Partial<ProjectMetadata>,
  projectName: string
): string {
  const parts = [];

  if (projectName) parts.push(`Project: ${projectName}`);
  if (metadata.domain) parts.push(`Domain: ${metadata.domain}`);
  if (metadata.industry) parts.push(`Industry: ${metadata.industry}`);
  if (metadata.project_type) parts.push(`Type: ${metadata.project_type}`);
  if (metadata.target_audience) parts.push(`Target Audience: ${metadata.target_audience}`);
  if (metadata.tech_stack?.length) parts.push(`Tech Stack: ${metadata.tech_stack.join(', ')}`);
  if (metadata.key_goals?.length) parts.push(`Goals: ${metadata.key_goals.join(', ')}`);
  if (metadata.requirements) parts.push(`Requirements: ${metadata.requirements}`);
  if (metadata.budget_range) parts.push(`Budget: ${metadata.budget_range}`);
  if (metadata.pricing_information) parts.push(`Pricing: ${metadata.pricing_information}`);
  if (metadata.additional_context) parts.push(`Context: ${metadata.additional_context}`);
  
  return parts.filter(Boolean).join('\n');
}

export interface ProjectEmbeddingData {
  projectId: string;
  companyId: string;
  contentType: 'project_metadata' | 'document' | 'document_chunk';
  contentId?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

/**
 * Store project embedding in the database
 * @param supabase - Supabase client
 * @param data - Embedding data
 * @returns Success status
 */
export async function storeProjectEmbedding(
  supabase: SupabaseClient,
  data: ProjectEmbeddingData
): Promise<{ success: boolean; error?: string }> {
  try {
    let embedding = data.embedding;
    if (!embedding) {
      const result = await generateEmbedding(data.content);
      if (result.error) {
        return { success: false, error: result.error };
      }
      embedding = result.embedding;
    }

    // Convert embedding array to string for pgvector
    const embeddingStr = `[${embedding.join(',')}]`;

    const { error } = await supabase
      .from('project_embeddings')
      .insert([{
        project_id: data.projectId,
        company_id: data.companyId,
        content_type: data.contentType,
        content_id: data.contentId,
        content: data.content,
        metadata: data.metadata,
        embedding: embeddingStr
      }]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error storing project embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Store project metadata with automatic embedding generation
 * @param supabase - Supabase client
 * @param projectId - Project ID
 * @param companyId - Company ID
 * @param projectName - Project name
 * @param metadata - Project metadata
 * @returns Success status
 */
export async function storeProjectMetadataWithEmbedding(
  supabase: SupabaseClient,
  projectId: string,
  companyId: string,
  projectName: string,
  metadata: Partial<ProjectMetadata>
): Promise<{ success: boolean; error?: string; metadataId?: string }> {
  try {
    // Upsert project metadata
    const { data: metadataData, error: metadataError } = await supabase
      .from('project_metadata')
      .upsert({
        project_id: projectId,
        company_id: companyId,
        ...metadata,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (metadataError) throw metadataError;

    // Delete old project_metadata embeddings
    await supabase
      .from('project_embeddings')
      .delete()
      .eq('project_id', projectId)
      .eq('content_type', 'project_metadata');

    // Generate and store embedding
    const content = prepareProjectMetadataForEmbedding(metadata, projectName);
    const embeddingResult = await generateEmbedding(content);

    if (embeddingResult.error) {
      console.warn('Warning: Failed to generate embedding:', embeddingResult.error);
      return { success: true, metadataId: metadataData.id, error: embeddingResult.error };
    }

    // Fetch project status
    const { data: project } = await supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .single();

    // Convert embedding array to string for pgvector
    const embeddingStr = `[${embeddingResult.embedding.join(',')}]`;

    await supabase
      .from('project_embeddings')
      .insert({
        project_id: projectId,
        company_id: companyId,
        content_type: 'project_metadata',
        content_id: metadataData.id,
        content: content,
        embedding: embeddingStr,
        metadata: {
          source: 'project_metadata',
          project_name: projectName,
          status: project?.status || 'active'
        }
      });

    return { success: true, metadataId: metadataData.id };
  } catch (error) {
    console.error('Error storing project metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate embedding for a project document
 * @param supabase - Supabase client
 * @param projectId - Project ID
 * @param companyId - Company ID
 * @param documentId - Document ID
 * @returns Success status
 */
export async function generateProjectDocumentEmbedding(
  supabase: SupabaseClient,
  projectId: string,
  companyId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call edge function to generate embedding
    const { data, error } = await supabase.functions.invoke('generate-project-embedding', {
      body: {
        type: 'document',
        project_id: projectId,
        company_id: companyId,
        document_id: documentId
      }
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error generating document embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate embedding for project metadata
 * @param supabase - Supabase client
 * @param projectId - Project ID
 * @param companyId - Company ID
 * @returns Success status
 */
export async function generateProjectMetadataEmbedding(
  supabase: SupabaseClient,
  projectId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call edge function to generate embedding
    const { data, error } = await supabase.functions.invoke('generate-project-embedding', {
      body: {
        type: 'metadata',
        project_id: projectId,
        company_id: companyId
      }
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error generating metadata embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search project content using semantic search
 * @param supabase - Supabase client
 * @param projectId - Project ID
 * @param query - Natural language query
 * @param threshold - Minimum similarity score (default: 0.78)
 * @param limit - Maximum results (default: 10)
 * @returns Array of matching documents
 */
export async function searchProjectContent(
  supabase: SupabaseClient,
  projectId: string,
  query: string,
  threshold: number = 0.78,
  limit: number = 10
): Promise<any[]> {
  try {
    const result = await generateEmbedding(query);
    if (result.error) {
      console.error('Error generating query embedding:', result.error);
      return [];
    }

    const { data, error } = await supabase
      .rpc('match_project_documents', {
        p_query_embedding: result.embedding,
        p_project_id: projectId,
        p_match_threshold: threshold,
        p_match_count: limit
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching project content:', error);
    return [];
  }
}

/**
 * Search across all company projects
 * @param supabase - Supabase client
 * @param companyId - Company ID
 * @param query - Natural language query
 * @param threshold - Minimum similarity score (default: 0.78)
 * @param limit - Maximum results (default: 10)
 * @returns Array of matching documents
 */
export async function searchCompanyProjects(
  supabase: SupabaseClient,
  companyId: string,
  query: string,
  threshold: number = 0.78,
  limit: number = 10
): Promise<any[]> {
  try {
    const result = await generateEmbedding(query);
    if (result.error) {
      console.error('Error generating query embedding:', result.error);
      return [];
    }

    const { data, error } = await supabase
      .rpc('match_company_projects', {
        p_query_embedding: result.embedding,
        p_company_id: companyId,
        p_match_threshold: threshold,
        p_match_count: limit
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching company projects:', error);
    return [];
  }
}

/**
 * Delete project embeddings by type
 * @param supabase - Supabase client
 * @param projectId - Project ID
 * @param contentType - Content type to delete
 */
export async function deleteProjectEmbeddingsByType(
  supabase: SupabaseClient,
  projectId: string,
  contentType: string
): Promise<void> {
  await supabase
    .from('project_embeddings')
    .delete()
    .eq('project_id', projectId)
    .eq('content_type', contentType);
}

/**
 * Delete all embeddings for a project
 * @param supabase - Supabase client
 * @param projectId - Project ID
 */
export async function deleteAllProjectEmbeddings(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  await supabase
    .from('project_embeddings')
    .delete()
    .eq('project_id', projectId);
}
