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
