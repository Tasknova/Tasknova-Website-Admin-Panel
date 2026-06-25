import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'

/**
 * GET endpoint to fetch API logs
 * Query parameters:
 *   - agent_id: Filter by agent ID
 *   - endpoint: Filter by endpoint path
 *   - limit: Number of records to return (default: 100)
 *   - offset: Pagination offset (default: 0)
 *   - success: Filter by success status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const agent_id = searchParams.get('agent_id')
    const endpoint = searchParams.get('endpoint')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const success = searchParams.get('success')

    const client = createServerClient()

    let query = client
      .from('api_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    }

    if (success !== null) {
      query = query.eq('success', success === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch logs: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      logs: data || [],
      total_count: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching API logs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

/**
 * DELETE endpoint to clear old logs
 * Query parameters:
 *   - days_old: Delete logs older than this many days (default: 30)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysOld = parseInt(searchParams.get('days_old') || '30')

    const client = createServerClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { error, count } = await client
      .from('api_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete logs: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Deleted logs older than ${daysOld} days`,
      deleted_count: count,
    })
  } catch (error) {
    console.error('Error deleting API logs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete logs' },
      { status: 500 }
    )
  }
}
