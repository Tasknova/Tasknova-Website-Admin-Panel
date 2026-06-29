import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getIndusLabsAccessToken } from '@/lib/aiAgentsUtils'
import { triggerEvaluationPipeline } from '@/lib/c2cEvaluation'

export const dynamic = 'force-dynamic'

interface InitiateC2CCallRequest {
  from_number: string
  to_number: string
  did: string
  transcript?: boolean
  transcript_language?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InitiateC2CCallRequest
    const {
      from_number,
      to_number,
      did,
      transcript = true,
      transcript_language = 'en',
    } = body

    if (!from_number || !to_number || !did) {
      return NextResponse.json(
        { error: 'from_number, to_number, and did are required' },
        { status: 400 }
      )
    }

    // Normalize numbers
    const normalizeNumber = (num: string) => {
      const trimmed = num.trim()
      return trimmed.startsWith('91') ? trimmed : `91${trimmed}`
    }

    const normalizedFrom = normalizeNumber(from_number)
    const normalizedTo = normalizeNumber(to_number)

    const client = createServerClient()

    // Get callback URL from settings (same as AI Calling Agents)
    const { data: callbackSetting } = await client
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'callback_url')
      .single()

    const callback_url =
      callbackSetting?.setting_value ||
      'https://admin.tasknova.io/api/webhooks/ai-agents/indus'

    // Get access token
    const accessToken = await getIndusLabsAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with IndusLabs' },
        { status: 500 }
      )
    }

    console.log('[C2C] Initiating call:', { from: normalizedFrom, to: normalizedTo, did })

    // Call IndusLabs Click2Call API
    let response: Response
    try {
      response = await fetch('https://developer.induslabs.io/api/calls/click2call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customer_number: normalizedTo,
          agent_number: normalizedFrom,
          did,
          callback_url,
          transcript,
          transcript_language,
        }),
      })
    } catch (fetchError) {
      return NextResponse.json(
        { error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}` },
        { status: 500 }
      )
    }

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[C2C] IndusLabs error:', response.status, errorBody)
      return NextResponse.json(
        { error: `IndusLabs API error: ${response.status} - ${errorBody}` },
        { status: response.status }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let callData: any
    try {
      callData = await response.json()
    } catch {
      return NextResponse.json({ error: 'Invalid response from IndusLabs' }, { status: 500 })
    }

    const call_id = callData.data?.call_id
    const callStatus = callData.data?.status

    if (!call_id) {
      return NextResponse.json({ error: 'No call_id returned from IndusLabs' }, { status: 500 })
    }

    const normalizedStatus =
      callStatus === 'success' ? 'in_progress' : callStatus === 'failed' ? 'failed' : 'pending'

    // Store in c2c_calls table
    const { error: insertError } = await client.from('c2c_calls').insert({
      call_id,
      from_number: normalizedFrom,
      to_number: normalizedTo,
      did,
      status: normalizedStatus,
      transcript_status: 'pending',
      started_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[C2C] Failed to store call:', insertError)
      return NextResponse.json(
        { error: `Failed to store call record: ${insertError.message}` },
        { status: 500 }
      )
    }

    const jsonResponse = NextResponse.json({
      success: true,
      call_id,
      call_status: normalizedStatus,
      message: normalizedStatus === 'in_progress' ? 'Call initiated successfully' : `Call status: ${normalizedStatus}`,
    })

    // Start transcript polling in background (fire and forget)
    if (transcript && normalizedStatus === 'in_progress') {
      pollTranscriptInBackground(call_id, accessToken, client).catch((error) => {
        console.error('Background transcript polling error:', error)
      })
    }

    return jsonResponse
  } catch (error) {
    console.error('[C2C] Error initiating call:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate call' },
      { status: 500 }
    )
  }
}

// Background function for transcript polling (doesn't block the response)
async function pollTranscriptInBackground(
  call_id: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
) {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const maxAttempts = 60

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const transcriptResponse = await fetch(
        `https://developer.induslabs.io/api/calls/${call_id}/transcript`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (transcriptResponse.ok) {
        const transcriptPayload = (await transcriptResponse.json()) as {
          data?: {
            transcript_status?: string
            duration?: string | number | null
            recording?: string | null
            transcript?: {
              summary?: string | null
              call_outcome?: string | null
              transcript_id?: string | null
              history?: unknown[]
              createdAt?: string
            } | null
            error?: string | null
          }
        }

        const transcriptStatus = transcriptPayload.data?.transcript_status
        const durationRaw = transcriptPayload.data?.duration
        const duration = durationRaw ? Number(durationRaw) : null
        const recordingUrl = transcriptPayload.data?.recording || null

        if (transcriptStatus === 'ready') {
          const summary = transcriptPayload.data?.transcript?.summary || null
          const callOutcome = transcriptPayload.data?.transcript?.call_outcome || null
          const transcriptId = transcriptPayload.data?.transcript?.transcript_id || null
          const history = transcriptPayload.data?.transcript?.history || []

          await client
            .from('c2c_transcripts')
            .upsert({
              call_id,
              transcript_id: transcriptId,
              summary,
              call_outcome: callOutcome,
              history,
            })

          const transcriptCreatedAt = transcriptPayload.data?.transcript?.createdAt || null

          await client
            .from('c2c_calls')
            .update({
              transcript_status: 'completed',
              duration: duration ?? 0,
              recording_url: recordingUrl,
              outcome: callOutcome,
              status: 'completed',
              ended_at: transcriptCreatedAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('call_id', call_id)

          if (recordingUrl) {
            await triggerEvaluationPipeline({
              callId: call_id,
              recordingUrl,
            })
          }
          return
        }

        if (transcriptStatus === 'failed') {
          await client
            .from('c2c_calls')
            .update({
              transcript_status: 'failed',
              duration: duration ?? 0,
              recording_url: recordingUrl,
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('call_id', call_id)
          return
        }
      }
    } catch (error) {
      console.error('[C2C] Background polling error on attempt', attempt, ':', error)
    }

    await sleep(2000)
  }
}

