import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  try {
    // Fetch counts
    const [
      { count: demoCount },
      { count: applicantCount },
      { data: jobs },
      { data: blogs },
      { count: playbookCount },
      { count: reportCount },
      { count: voiceCount },
      { count: chatCount },
    ] = await Promise.all([
      supabase.from('demo_requests').select('*', { count: 'exact', head: true }),
      supabase.from('job_applicants').select('*', { count: 'exact', head: true }),
      supabase.from('job_openings').select('*', { count: 'exact' }),
      supabase.from('blogs').select('*', { count: 'exact' }),
      supabase.from('playbooks').select('*', { count: 'exact', head: true }),
      supabase.from('industry_reports').select('*', { count: 'exact', head: true }),
      supabase.from('voice_conversations').select('*', { count: 'exact', head: true }),
      supabase.from('chat_conversations').select('*', { count: 'exact', head: true }),
    ])

    // Fetch recent data
    const { data: recentDemos } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentApplicants } = await supabase
      .from('job_applicants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentVoiceCalls } = await supabase
      .from('voice_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    interface JobRecord {
      is_active: boolean;
    }
    interface BlogRecord {
      is_published: boolean;
    }
    const activeJobs = jobs?.filter((job: JobRecord) => job.is_active).length || 0
    const publishedBlogs = blogs?.filter((blog: BlogRecord) => blog.is_published).length || 0

    return NextResponse.json({
      stats: {
        totalDemoRequests: demoCount || 0,
        totalJobApplicants: applicantCount || 0,
        activeJobOpenings: activeJobs,
        publishedBlogs: publishedBlogs,
        totalPlaybooks: playbookCount || 0,
        totalReports: reportCount || 0,
        totalVoiceConversations: voiceCount || 0,
        totalChatConversations: chatCount || 0,
      },
      recentDemos: recentDemos || [],
      recentApplicants: recentApplicants || [],
      recentVoiceCalls: recentVoiceCalls || [],
    })
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
