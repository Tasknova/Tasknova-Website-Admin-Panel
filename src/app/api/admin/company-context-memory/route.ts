import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'all'
  const sort = searchParams.get('sort') || 'recent'

  const orderBy = sort === 'accessed' ? 'last_accessed_at' : sort === 'confidence' ? 'confidence_score' : 'created_at'
  const ascending = sort === 'confidence'

  const supabase = createServerClient()

  try {
    let query = supabase
      .from('company_context_memory')
      .select('*')
      .eq('user_id', session.id)

    if (filter === 'pinned') {
      query = query.eq('is_pinned', true)
    }

    const { data, error } = await query.order(orderBy, { ascending })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Company context memory fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch company context memory' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, is_pinned } = body

  if (!id || typeof is_pinned !== 'boolean') {
    return NextResponse.json({ error: 'id and is_pinned are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const { error } = await supabase
      .from('company_context_memory')
      .update({ is_pinned })
      .eq('id', id)
      .eq('user_id', session.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Company context memory update error:', error)
    return NextResponse.json({ error: 'Failed to update company context memory' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    const { error } = await supabase
      .from('company_context_memory')
      .delete()
      .eq('id', id)
      .eq('user_id', session.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Company context memory delete error:', error)
    return NextResponse.json({ error: 'Failed to delete company context memory' }, { status: 500 })
  }
}
