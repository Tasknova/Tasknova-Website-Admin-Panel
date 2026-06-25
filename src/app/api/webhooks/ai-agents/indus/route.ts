import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import {
  classifyCall,
  logAuditEvent,
} from '@/lib/aiAgentsUtils'
import { triggerEvaluationPipeline } from '@/lib/aiCallingEvaluation'

interface WebhookBody {
  event: string
  data: Record<string, unknown>
}

interface CallCompletedData {
  call_id: string
  duration?: number
  recording_url?: string
  end_time?: string
}

interface CallFailedData {
  call_id: string
  error?: string
}

interface TranscriptReadyData {
  call_id: string
  transcript?: string
  summary?: string
  outcome?: string
}

interface TranscriptFailedData {
  call_id: string
  error?: string
}

function parseTranscriptPayload(transcript: unknown): unknown[] {
  if (Array.isArray(transcript)) {
    return transcript
  }

  if (typeof transcript === 'string') {
    try {
      const parsed = JSON.parse(transcript) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

export async function POST(req: NextRequest) {
  try {
    const client = createServerClient()
    const body = (await req.json()) as WebhookBody

    const { event, data } = body

    // Log webhook received
    console.log(`Received webhook event: ${event}`, data)
    await logAuditEvent(`webhook.${event}`, data)

    switch (event) {
      case 'call.completed': {
        return await handleCallCompleted(client, data as unknown as CallCompletedData)
      }

      case 'call.failed': {
        return await handleCallFailed(client, data as unknown as CallFailedData)
      }

      case 'transcript.ready': {
        return await handleTranscriptReady(client, data as unknown as TranscriptReadyData)
      }

      case 'transcript.failed': {
        return await handleTranscriptFailed(client, data as unknown as TranscriptFailedData)
      }

      default:
        console.log(`Unknown event type: ${event}`)
        return NextResponse.json({ received: true })
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCallCompleted(
  client: ReturnType<typeof createServerClient>,
  data: CallCompletedData
) {
  const { call_id, duration, recording_url, end_time } = data

  // Ensure idempotency - check if already processed
  const { data: existingCall } = await client
    .from('ai_calls')
    .select('call_id')
    .eq('call_id', call_id)
    .single()

  if (!existingCall) {
    // Create new call record if not found (external call)
    await client.from('ai_calls').insert({
      call_id,
      status: 'completed',
      duration: duration || 0,
      recording_url,
      ended_at: end_time || new Date().toISOString(),
    })
  } else {
    // Update existing call
    await client
      .from('ai_calls')
      .update({
        status: 'completed',
        duration: duration || 0,
        recording_url,
        ended_at: end_time || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('call_id', call_id)
  }

  await logAuditEvent('call.completed.processed', { call_id, duration })

  if (recording_url) {
    await triggerEvaluationPipeline({
      callId: call_id,
      recordingUrl: recording_url,
    })
  }

  return NextResponse.json({ received: true, event: 'call.completed' })
}

async function handleCallFailed(
  client: ReturnType<typeof createServerClient>,
  data: CallFailedData
) {
  const { call_id } = data

  const { data: existingCall } = await client
    .from('ai_calls')
    .select('call_id')
    .eq('call_id', call_id)
    .single()

  if (existingCall) {
    await client
      .from('ai_calls')
      .update({
        status: 'failed',
        call_type: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('call_id', call_id)
  }

  await logAuditEvent('call.failed.processed', { call_id })

  return NextResponse.json({ received: true, event: 'call.failed' })
}

async function handleTranscriptReady(
  client: ReturnType<typeof createServerClient>,
  data: TranscriptReadyData
) {
  const { call_id, transcript, summary, outcome } = data

  // Get call to check duration
  const { data: callRecord } = await client
    .from('ai_calls')
    .select('duration, agent_id, recording_url')
    .eq('call_id', call_id)
    .single()

  if (!callRecord) {
    console.log(`Call not found: ${call_id}`)
    return NextResponse.json({ received: true, event: 'transcript.ready' })
  }

  const { duration, recording_url } = callRecord

  // Classify call
  const callType = classifyCall(duration || 0, !!transcript)

  // Update call with transcript info
  await client
    .from('ai_calls')
    .update({
      call_type: callType,
      transcript_status: 'completed',
      outcome,
      updated_at: new Date().toISOString(),
    })
    .eq('call_id', call_id)

  // Store transcript
  const transcriptData = parseTranscriptPayload(transcript)
  await client.from('ai_transcripts').upsert(
    {
      call_id,
      summary,
      call_outcome: outcome,
      history: transcriptData,
      raw_text: typeof transcript === 'string' ? transcript : JSON.stringify(transcriptData),
    },
    { onConflict: 'call_id' }
  )

  if (recording_url) {
    await triggerEvaluationPipeline({
      callId: call_id,
      recordingUrl: recording_url,
    })
  }

  return NextResponse.json({ received: true, event: 'transcript.ready' })
}

async function handleTranscriptFailed(
  client: ReturnType<typeof createServerClient>,
  data: TranscriptFailedData
) {
  const { call_id } = data

  const { data: callRecord } = await client
    .from('ai_calls')
    .select('call_id')
    .eq('call_id', call_id)
    .single()

  if (callRecord) {
    await client
      .from('ai_calls')
      .update({
        call_type: 'failed',
        transcript_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('call_id', call_id)
  }

  await logAuditEvent('transcript.failed.processed', { call_id })

  return NextResponse.json({ received: true, event: 'transcript.failed' })
}
