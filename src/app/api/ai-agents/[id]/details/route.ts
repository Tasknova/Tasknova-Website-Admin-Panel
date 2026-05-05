import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getIndusLabsAgentDetails } from '@/lib/aiAgentsUtils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    const client = createServerClient()

    // Get local agent data from database
    const { data: localAgent, error: localError } = await client
      .from('ai_agents')
      .select(`
        *,
        prompt_versions:prompt_versions(*)
      `)
      .eq('agent_id', id)
      .single()

    if (localError || !localAgent) {
      return NextResponse.json(
        { error: 'Agent not found in local database' },
        { status: 404 }
      )
    }

    // Fetch additional details from IndusLabs API
    const remoteDetails = await getIndusLabsAgentDetails(id)

    // Combine local and remote data
    const agentDetails = {
      local: localAgent,
      remote: remoteDetails || null,
    }

    return NextResponse.json(agentDetails)
  } catch (error) {
    console.error('Error fetching agent details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent details' },
      { status: 500 }
    )
  }
}
