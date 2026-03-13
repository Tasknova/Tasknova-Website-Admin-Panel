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
    const { data, error } = await supabase
      .from('daily_standup_meetings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Daily standup meetings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily standup meetings' },
      { status: 500 }
    )
  }
}
