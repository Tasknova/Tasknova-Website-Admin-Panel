import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const client = createServerClient()

    // Fetch agents with call metrics
    const { data: agents, error } = await client
      .from('ai_agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    // Enrich agents with metrics
    const enrichedAgents = await Promise.all(
      agents.map(async (agent) => {
        const { data: callData } = await client
          .from('ai_calls')
          .select('status, call_type')
          .eq('agent_id', agent.agent_id)

        let evalData = []
        if (callData && callData.length > 0) {
          const { data: evals } = await client
            .from('ai_evaluations')
            .select('score')
            .in('call_id', callData.map((c) => c.call_id))
          evalData = evals || []
        }

        const totalCalls = callData?.length || 0
        const validCalls = callData?.filter((c) => c.call_type === 'valid').length || 0
        const failedCalls = callData?.filter((c) => c.call_type === 'failed').length || 0
        const avgScore =
          evalData && evalData.length > 0
            ? evalData.reduce((sum, e) => sum + e.score, 0) / evalData.length
            : 0

        return {
          ...agent,
          total_calls: totalCalls,
          valid_calls: validCalls,
          failed_calls: failedCalls,
          avg_score: Math.round(avgScore * 100) / 100,
        }
      })
    )

    return NextResponse.json({
      agents: enrichedAgents,
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
