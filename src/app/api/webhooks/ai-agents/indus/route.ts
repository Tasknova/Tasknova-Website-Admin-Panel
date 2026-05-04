import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import {
  evaluateCall,
  classifyCall,
  logAuditEvent,
  getMinCallDuration,
} from '@/lib/aiAgentsUtils'

export async function POST(req: NextRequest) {
  try {
    const client = createServerClient()
    const body = await req.json()

    const { event, data } = body

    // Log webhook received
    console.log(`Received webhook event: ${event}`, data)
    await logAuditEvent(`webhook.${event}`, data)

    switch (event) {
      case 'call.completed': {
        return await handleCallCompleted(client, data)
      }

      case 'call.failed': {
        return await handleCallFailed(client, data)
      }

      case 'transcript.ready': {
        return await handleTranscriptReady(client, data)
      }

      case 'transcript.failed': {
        return await handleTranscriptFailed(client, data)
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

async function handleCallCompleted(client: any, data: any) {
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

  return NextResponse.json({ received: true, event: 'call.completed' })
}

async function handleCallFailed(client: any, data: any) {
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

async function handleTranscriptReady(client: any, data: any) {
  const { call_id, transcript, summary, outcome } = data
  const minCallDuration = await getMinCallDuration()

  // Get call to check duration
  const { data: callRecord } = await client
    .from('ai_calls')
    .select('duration, agent_id')
    .eq('call_id', call_id)
    .single()

  if (!callRecord) {
    console.log(`Call not found: ${call_id}`)
    return NextResponse.json({ received: true, event: 'transcript.ready' })
  }

  const { duration, agent_id } = callRecord

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
  const transcriptData = typeof transcript === 'string' ? JSON.parse(transcript) : transcript
  await client.from('ai_transcripts').upsert(
    {
      call_id,
      summary,
      call_outcome: outcome,
      history: transcriptData || [],
      raw_text: JSON.stringify(transcriptData),
    },
    { onConflict: 'call_id' }
  )

  // Evaluate only if valid call (duration >= minCallDuration)
  if (callType === 'valid' && duration && duration >= minCallDuration) {
    try {
      const evaluation = await evaluateCall({
        transcript_history: transcriptData,
        summary,
        outcome,
        duration,
      })

      // Store evaluation
      await client.from('ai_evaluations').upsert(
        {
          call_id,
          score: evaluation.score,
          issues: evaluation.issues,
          suggestions: evaluation.suggestions,
        },
        { onConflict: 'call_id' }
      )

      // Update prompt version performance
      const { data: callData } = await client
        .from('ai_calls')
        .select('prompt_version_id')
        .eq('call_id', call_id)
        .single()

      if (callData?.prompt_version_id) {
        const { data: promptVersion } = await client
          .from('prompt_versions')
          .select('performance_score, call_count')
          .eq('id', callData.prompt_version_id)
          .single()

        if (promptVersion) {
          const currentScore = promptVersion.performance_score || 0
          const currentCount = promptVersion.call_count || 0
          const newScore =
            (currentScore * currentCount + evaluation.score) / (currentCount + 1)

          await client
            .from('prompt_versions')
            .update({
              performance_score: newScore,
              call_count: currentCount + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', callData.prompt_version_id)
        }
      }

      await logAuditEvent('transcript.evaluated', {
        call_id,
        score: evaluation.score,
        agent_id,
      })
    } catch (error) {
      console.error('Evaluation failed:', error)
      await logAuditEvent('transcript.evaluation.failed', { call_id, error: String(error) })
    }
  }

  return NextResponse.json({ received: true, event: 'transcript.ready' })
}

async function handleTranscriptFailed(client: any, data: any) {
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
