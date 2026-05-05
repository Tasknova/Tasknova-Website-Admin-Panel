import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface EvaluationRecord {
  id: string
  call_id: string
  score: number
  issues?: string[]
  suggestions?: string[]
  created_at: string
  ai_calls?: {
    call_id: string
    agent_id: string
    call_type: string
    duration: number
    created_at: string
    ai_agents?: { name: string }
  }
}

export async function GET(req: NextRequest) {
  try {
    const client = createServerClient()
    const searchParams = req.nextUrl.searchParams

    // Get filter parameters
    const minScore = searchParams.get('min_score')
    const maxScore = searchParams.get('max_score')
    const agentId = searchParams.get('agent_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = client
      .from('ai_evaluations')
      .select(`
        *,
        ai_calls(
          call_id,
          agent_id,
          call_type,
          duration,
          created_at,
          ai_agents(name)
        )
      `)

    // Apply filters
    if (minScore) {
      query = query.gte('score', parseFloat(minScore))
    }
    if (maxScore) {
      query = query.lte('score', parseFloat(maxScore))
    }

    // If agent_id filter is applied, we need to filter on the joined table
    // For now, we'll fetch and filter client-side for simplicity
    const { data: allEvals, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch evaluations' },
        { status: 500 }
      )
    }

    // Client-side filter by agent if needed
    let evaluations: EvaluationRecord[] = (allEvals as EvaluationRecord[]) || []
    if (agentId) {
      evaluations = evaluations.filter((e: { ai_calls?: { agent_id: string } }) => e.ai_calls?.agent_id === agentId)
    }

    return NextResponse.json({
      evaluations,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching evaluations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
