import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { callId } = params
    const client = createServerClient()

    const { data, error } = await client
      .from('c2c_evaluations')
      .select('*, c2c_calls(call_id, from_number, to_number, status, duration, recording_url, created_at, outcome, transcript_status, c2c_transcripts(summary, call_outcome, history, raw_text))')
      .eq('call_id', callId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    return NextResponse.json({ evaluation: data }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[C2C] Error fetching evaluation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
