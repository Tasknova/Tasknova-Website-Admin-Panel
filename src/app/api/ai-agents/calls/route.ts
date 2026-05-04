import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const client = createServerClient()
    const searchParams = req.nextUrl.searchParams

    // Get filter parameters
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')
    const callType = searchParams.get('call_type')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = client
      .from('ai_calls')
      .select(`
        *,
        ai_agents(name),
        ai_transcripts(summary, call_outcome),
        ai_evaluations(score, issues, suggestions)
      `)

    // Apply filters
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (callType) {
      query = query.eq('call_type', callType)
    }

    // Sort by created_at descending and apply pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch calls' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      calls: data,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
