import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchFreshRecordingUrl, transcribeRecording } from '@/lib/c2cEvaluation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow longer execution for Whisper

export async function GET(
  _req: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { callId } = params
    const client = createServerClient()

    // 1. Fetch evaluation and check if Whisper is already generated
    const { data: evaluation, error: evalError } = await client
      .from('c2c_evaluations')
      .select('transcript_text, analysis_json, c2c_calls(recording_url)')
      .eq('call_id', callId)
      .maybeSingle()

    if (evalError) {
      return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 })
    }

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    const analysisJson = evaluation.analysis_json as Record<string, unknown> | null
    if (analysisJson?.whisper_generated === true && evaluation.transcript_text) {
      // Already generated, return it
      return NextResponse.json({ transcript: evaluation.transcript_text })
    }

    // 2. We need to generate it. Get recording URL.
    const rawCall = Array.isArray(evaluation.c2c_calls) ? evaluation.c2c_calls[0] : evaluation.c2c_calls
    const callData = rawCall as unknown as Record<string, unknown> | null
    let recordingUrl = typeof callData?.recording_url === 'string' ? callData.recording_url : null

    // If it's missing or pending, try to fetch a fresh one
    if (!recordingUrl || recordingUrl === 'pending' || recordingUrl === 'failed') {
      const freshUrl = await fetchFreshRecordingUrl(callId)
      if (freshUrl) {
        recordingUrl = freshUrl
        // Update it in the database
        await client.from('c2c_calls').update({ recording_url: freshUrl, updated_at: new Date().toISOString() }).eq('call_id', callId)
      }
    }

    if (!recordingUrl || recordingUrl === 'pending' || recordingUrl === 'failed') {
      return NextResponse.json({ error: 'Recording URL is not available yet' }, { status: 400 })
    }

    // 3. Transcribe with Whisper
    const whisperResult = await transcribeRecording(recordingUrl)

    // 4. Update the evaluation record
    const updatedAnalysisJson = {
      ...(analysisJson || {}),
      whisper_generated: true,
    }

    const { error: updateError } = await client
      .from('c2c_evaluations')
      .update({
        transcript_text: whisperResult.text,
        analysis_json: updatedAnalysisJson,
        updated_at: new Date().toISOString(),
      })
      .eq('call_id', callId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
    }

    // 5. Return the new transcript
    return NextResponse.json({ transcript: whisperResult.text })

  } catch (error) {
    console.error('[C2C Whisper] Error generating transcript:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
