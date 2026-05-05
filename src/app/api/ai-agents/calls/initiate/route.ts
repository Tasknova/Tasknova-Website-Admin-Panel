import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getIndusLabsAccessToken, logAuditEvent } from '@/lib/aiAgentsUtils'

interface InitiateCallRequest {
  customer_number: string
  agent_id: string
  did: string
  transcript?: boolean
  transcript_language?: string
  agent_config?: {
    customer_name?: string
    jewellery_shop_name?: string
    pending_amount?: string
    last_call_date?: string
    [key: string]: string | undefined
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InitiateCallRequest
    const { customer_number, agent_id, did, transcript = true, transcript_language = 'en', agent_config } = body

    // Validate input
    if (!customer_number || !agent_id || !did) {
      return NextResponse.json(
        { error: 'customer_number, agent_id, and did are required' },
        { status: 400 }
      )
    }

    // Normalize phone number: add 91 prefix if not already present
    let normalizedCustomerNumber = customer_number.trim()
    if (!normalizedCustomerNumber.startsWith('91')) {
      normalizedCustomerNumber = '91' + normalizedCustomerNumber
    }

    const client = createServerClient()

    // Get agent details from database
    const { data: agent, error: agentError } = await client
      .from('ai_agents')
      .select('*')
      .eq('agent_id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Use agent_id as agent_number for the API call
    const agent_number = agent_id

    if (!agent_number || !did) {
      return NextResponse.json(
        { error: 'Organization DID is required. Please provide it in the call form.' },
        { status: 400 }
      )
    }

    // Get callback URL from settings
    const { data: callbackSetting } = await client
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'callback_url')
      .single()

    const callback_url =
      callbackSetting?.setting_value || 'https://admin.tasknova.io/api/webhooks/ai-agents/indus'

    // Get access token
    const accessToken = await getIndusLabsAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with IndusLabs' },
        { status: 500 }
      )
    }

    console.log('Initiating call with:', {
      original_number: customer_number,
      normalized_number: normalizedCustomerNumber,
      agent_number,
      did,
      callback_url,
    })

    // Call IndusLabs Click2Call API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clickToCallPayload: any = {
      customer_number: normalizedCustomerNumber,
      agent_number,
      did,
      callback_url,
      transcript,
      transcript_language,
    }

    // Add agent_config if provided
    if (agent_config) {
      clickToCallPayload.agent_config = agent_config
    }
    
    console.log('Sending to IndusLabs:', JSON.stringify(clickToCallPayload, null, 2))
    
    let response: Response
    try {
      response = await fetch('https://developer.induslabs.io/api/calls/click2call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(clickToCallPayload),
      })
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log('IndusLabs response status:', response.status)
    
    if (!response.ok) {
      const errorBody = await response.text()
      console.error('IndusLabs Click2Call failed:', response.status, errorBody)
      return NextResponse.json(
        { error: `IndusLabs API error: ${response.status} - ${errorBody}` },
        { status: response.status }
      )
    }

    const responseBody = await response.text()
    console.log('IndusLabs response body:', responseBody)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let callData: any
    try {
      callData = JSON.parse(responseBody) as {
        data?: { call_id?: string; status?: string }
      }
    } catch (parseError) {
      console.error('Failed to parse IndusLabs response:', parseError)
      return NextResponse.json(
        { error: 'Invalid response from IndusLabs API' },
        { status: 500 }
      )
    }

    const call_id = callData.data?.call_id
    const callStatus = callData.data?.status

    if (!call_id) {
      return NextResponse.json(
        { error: 'No call_id returned from IndusLabs' },
        { status: 500 }
      )
    }

    const normalizedCallStatus = callStatus === 'success'
      ? 'success'
      : callStatus === 'failed'
        ? 'failed'
        : 'pending'

    // Store call in database
    const { error: insertError } = await client.from('ai_calls').insert({
      call_id,
      agent_id,
      customer_number: normalizedCustomerNumber,
      agent_number,
      did,
      status: normalizedCallStatus,
      call_type: normalizedCallStatus === 'success' ? 'valid' : normalizedCallStatus === 'failed' ? 'failed' : 'unknown',
      transcript_status: transcript ? 'pending' : 'pending',
      agent_config: agent_config || null,
    })

    if (insertError) {
      console.error('Failed to store call:', insertError)
      await logAuditEvent('call.initiate.db_error', { call_id, error: insertError })
    }

    await logAuditEvent('call.initiated', {
      call_id,
      agent_id,
      customer_number,
    })

    // Return immediately with call_id and status
    const jsonResponse = NextResponse.json({
      success: true,
      call_id,
      call_status: normalizedCallStatus,
      message: normalizedCallStatus === 'success' ? 'Call initiated successfully' : 'Call initiation status: ' + normalizedCallStatus,
    })

    // Start transcript polling in background (fire and forget)
    if (transcript && callStatus === 'success') {
      pollTranscriptInBackground(call_id, accessToken, client).catch((error) => {
        console.error('Background transcript polling error:', error)
      })
    }

    return jsonResponse
  } catch (error) {
    console.error('Error initiating call:', error)
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

      if (!transcriptResponse.ok) {
        const errorBody = await transcriptResponse.text()
        console.error('IndusLabs transcript fetch failed:', transcriptResponse.status, errorBody)
        await logAuditEvent('call.transcript.fetch_error', {
          call_id,
          status: transcriptResponse.status,
          error: errorBody,
          attempt,
        })
      } else {
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
            .from('ai_transcripts')
            .upsert({
              call_id,
              transcript_id: transcriptId,
              summary,
              call_outcome: callOutcome,
              history,
            })

          await client
            .from('ai_calls')
            .update({
              transcript_status: 'completed',
              duration: duration ?? 0,
              recording_url: recordingUrl,
              outcome: callOutcome,
              status: 'completed',
            })
            .eq('call_id', call_id)

          await logAuditEvent('call.transcript.ready', {
            call_id,
            transcript_id: transcriptId,
            duration,
          })
          return
        }

        if (transcriptStatus === 'failed') {
          await client
            .from('ai_calls')
            .update({
              transcript_status: 'failed',
              duration: duration ?? 0,
              recording_url: recordingUrl,
              status: 'failed',
            })
            .eq('call_id', call_id)

          await logAuditEvent('call.transcript.failed', {
            call_id,
            error: transcriptPayload.data?.error || null,
          })
          return
        }
      }
    } catch (error) {
      console.error('Background polling error on attempt', attempt, ':', error)
    }

    await sleep(2000)
  }

  console.log('Transcript polling completed for call:', call_id, 'max attempts reached')
  await logAuditEvent('call.transcript.timeout', {
    call_id,
    max_attempts: maxAttempts,
  })
}
