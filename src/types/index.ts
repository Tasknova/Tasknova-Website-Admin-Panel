export interface Admin {
  id: string
  full_name: string
  email: string
  password_hash: string
  role: 'super_admin' | 'admin'
  is_active: boolean
  created_at: string
  last_login: string | null
}

export interface DemoRequest {
  id: string
  name: string
  email: string
  company: string
  role: string
  team_size: string
  notes: string
  company_website: string
  company_scraped_info: any
  preferred_date: string
  preferred_time: string
  timezone: string
  mail_sent: boolean
  created_at: string
}

export interface JobOpening {
  id: string
  title: string
  department: string
  location: string
  type: string
  description: string
  about: string
  responsibilities: string[]
  skills: string[]
  gradient: string
  is_active: boolean
  created_at: string
}

export interface JobApplicant {
  id: string
  job_id: string
  full_name: string
  email: string
  phone: string
  experience_years: number
  portfolio_url: string
  resume_url: string
  cover_letter: string
  linkedin_url: string
  linkedin_scraped_data: any
  portfolio_scraped_data: any
  ai_score: number
  ai_score_reasoning: string
  answers: any
  created_at: string
}

export interface Blog {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  hero_image_url: string
  author: string
  author_role: string
  author_avatar_url: string
  category: string
  tags: string[]
  read_time: number
  is_published: boolean
  published_at: string
  created_at: string
  updated_at: string
}

export interface Playbook {
  id: string
  title: string
  slug: string
  description: string
  topics: string[]
  pages: number
  downloads: number
  gradient: string
  file_path: string
  file_url: string
  created_at: string
}

export interface IndustryReport {
  id: string
  title: string
  slug: string
  description: string
  year: string
  pages: number
  downloads: string
  gradient: string
  icon: string
  key_findings: string[]
  pdf_url: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface VoiceConversation {
  id: string
  org_id: string
  assistant_id: string
  status: string
  type: string
  started_at: string
  ended_at: string
  ended_reason: string
  duration_seconds: number
  cost: number
  cost_breakdown: any
  transcript: string
  summary: string
  messages: any
  recording_url: string
  stereo_recording_url: string
  web_call_url: string
  analysis: any
  artifact: any
  transport: any
  monitor: any
  customer_name: string
  customer_email: string
  customer_phone: string
  lead_details: string
  created_at: string
  updated_at: string
}

export interface ChatConversation {
  id: string
  agent_id: string
  session_id: string
  user_id: string
  messages: any
  summary: string
  metadata: any
  created_at: string
}

export interface DashboardStats {
  totalDemoRequests: number
  totalJobApplicants: number
  activeJobOpenings: number
  publishedBlogs: number
  totalPlaybooks: number
  totalReports: number
  totalVoiceConversations: number
  totalChatConversations: number
}

// =====================================================
// COMPANY BRAIN & PROJECT BRAIN TYPES
// =====================================================

export interface CompanyBrain {
  id: string
  user_id: string
  // Company Details
  company_name?: string
  tagline?: string
  company_description?: string
  industry?: string
  founded_year?: number
  company_size?: string
  location?: string
  // Contact Information
  website?: string
  email?: string
  phone?: string
  // Values & Mission
  mission_statement?: string
  vision_statement?: string
  core_values?: string[]
  unique_selling_points?: string[]
  // Business Information
  target_audience?: string
  products_services?: any
  pricing_model?: string
  key_features?: string[]
  // Team Information
  founder_info?: string
  leadership_team?: any
  team_size_details?: string
  // Additional Data
  additional_context?: string
  custom_fields?: any
  // Timestamps
  created_at: string
  updated_at: string
}

export interface DocumentGroup {
  id: string
  user_id: string
  group_name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface BrainDocument {
  id: string
  user_id: string
  company_brain_id?: string
  document_group_id?: string
  // File Metadata
  file_name: string
  file_type: 'pdf' | 'document' | 'image' | 'video' | 'audio' | 'other'
  file_size?: number
  mime_type?: string
  storage_path: string
  storage_url?: string
  // Organization
  description?: string
  tags?: string[]
  category?: string
  // Processing
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  extracted_text?: string
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CompanyBrainEmbedding {
  id: string
  user_id: string
  content_type: 'company_info' | 'document' | 'additional_context'
  content_id?: string
  content: string
  embedding: number[] // 768 dimensions
  metadata?: any
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  company_id: string
  created_by: string
  project_name: string
  description?: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  start_date?: string
  end_date?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface ProjectMetadata {
  id: string
  project_id: string
  company_id: string
  // Project Context
  domain?: string
  industry?: string
  project_type?: string
  target_audience?: string
  // Technical Information
  tech_stack?: string[]
  requirements?: string
  // Planning Information
  key_goals?: string[]
  milestones?: any
  team_size?: number
  budget_currency?: string
  budget_amount?: number
  // Priority & Pricing
  priority_level?: 'low' | 'medium' | 'high' | 'critical'
  pricing_information?: string
  // Additional Data
  custom_fields?: any
  additional_context?: string
  // Timestamps
  created_at: string
  updated_at: string
}

export interface ProjectDocument {
  id: string
  project_id: string
  company_id: string
  uploaded_by: string
  // File Metadata
  file_name: string
  file_type: 'pdf' | 'document' | 'image' | 'video' | 'audio' | 'other'
  file_size?: number
  mime_type?: string
  storage_path: string
  storage_url?: string
  // Organization
  title?: string
  description?: string
  tags?: string[]
  category?: string
  // Content
  content_text?: string  // Text content for AI embeddings
  extracted_text?: string
  // Processing
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  // Soft Delete
  is_deleted: boolean
  // Timestamps
  created_at: string
  updated_at: string
}

export interface ProjectEmbedding {
  id: string
  project_id: string
  company_id: string
  content_type: 'project_metadata' | 'document' | 'document_chunk'
  content_id?: string
  content: string
  embedding: number[] // 768 dimensions
  metadata?: any
  created_at: string
  updated_at: string
}

export interface SearchResult {
  id: string
  project_id?: string
  company_id?: string
  user_id?: string
  content_type: string
  content_id?: string
  content: string
  metadata?: any
  similarity: number
}
