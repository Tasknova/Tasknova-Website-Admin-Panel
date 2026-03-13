import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const filter = searchParams.get('filter') || 'all'
  const sort = searchParams.get('sort') || 'recent'

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const orderBy = sort === 'accessed' ? 'last_accessed_at' : sort === 'confidence' ? 'confidence_score' : 'created_at'
  const ascending = sort === 'confidence'

  const supabase = createServerClient()

  try {
    let query = supabase
      .from('project_context_memory')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', session.id)

    if (filter === 'pinned') {
      query = query.eq('is_pinned', true)
    }

    const { data, error } = await query.order(orderBy, { ascending })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Project context memory fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch project context memory' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, projectId, is_pinned } = body

  if (!id || !projectId || typeof is_pinned !== 'boolean') {
    return NextResponse.json({ error: 'id, projectId and is_pinned are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const { error } = await supabase
      .from('project_context_memory')
      .update({ is_pinned })
      .eq('id', id)
      .eq('project_id', projectId)
      .eq('user_id', session.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project context memory update error:', error)
    return NextResponse.json({ error: 'Failed to update project context memory' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const projectId = searchParams.get('projectId')

  if (!id || !projectId) {
    return NextResponse.json({ error: 'id and projectId are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const { error } = await supabase
      .from('project_context_memory')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)
      .eq('user_id', session.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project context memory delete error:', error)
    return NextResponse.json({ error: 'Failed to delete project context memory' }, { status: 500 })
  }
}
