import { createServerClient } from '@/lib/supabase'

export interface EvaluationInput {
  transcript_history?: any[]
  summary?: string
  outcome?: string
  duration?: number
}

export interface EvaluationOutput {
  score: number
  issues: string[]
  suggestions: string[]
}

/**
 * Evaluate a call based on transcript and call data
 * Scores range from 0-100
 */
export async function evaluateCall(input: EvaluationInput): Promise<EvaluationOutput> {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  // Duration validation
  if (!input.duration || input.duration < 10) {
    issues.push('Call duration too short (< 10 seconds)')
    score -= 30
  }

  // Transcript validation
  if (!input.transcript_history || input.transcript_history.length === 0) {
    issues.push('No transcript data available')
    score -= 25
  }

  // Sentiment/Outcome analysis
  if (!input.outcome) {
    issues.push('Call outcome not recorded')
    score -= 20
  } else {
    // Check for successful outcomes
    const successKeywords = ['successful', 'completed', 'achieved', 'closed', 'converted']
    const failureKeywords = ['failed', 'dropped', 'rejected', 'cancelled', 'abandoned']
    
    const outcomeLower = input.outcome.toLowerCase()
    const hasSuccess = successKeywords.some(kw => outcomeLower.includes(kw))
    const hasFailure = failureKeywords.some(kw => outcomeLower.includes(kw))

    if (hasFailure) {
      issues.push('Negative call outcome detected')
      score -= 25
    } else if (!hasSuccess) {
      issues.push('Call outcome unclear')
      score -= 10
    }
  }

  // Summary analysis
  if (!input.summary || input.summary.length < 10) {
    issues.push('Summary too brief or missing')
    score -= 15
  }

  // Generate suggestions
  if (score < 50) {
    suggestions.push('Review agent communication patterns')
    suggestions.push('Consider additional training for call handling')
  }

  if (score < 70) {
    suggestions.push('Analyze call outcomes for improvement opportunities')
    suggestions.push('Compare with high-performing agents')
  }

  if (score >= 80) {
    suggestions.push('Strong performance - maintain current approach')
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    issues,
    suggestions,
  }
}

/**
 * Classify a call based on duration and transcript availability
 */
export function classifyCall(duration: number, hasTranscript: boolean): 'valid' | 'invalid' | 'failed' {
  if (duration < 10) {
    return 'invalid'
  }
  if (!hasTranscript) {
    return 'failed'
  }
  return 'valid'
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  eventType: string,
  payload: Record<string, any>
) {
  const client = createServerClient()
  
  try {
    await client
      .from('ai_audit_logs')
      .insert({
        event_type: eventType,
        payload,
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Get IndusLabs API key from settings
 */
export async function getIndusLabsApiKey(): Promise<string | null> {
  const client = createServerClient()
  
  try {
    const { data } = await client
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'induslabs_api_key')
      .single()
    
    return data?.setting_value || null
  } catch (error) {
    console.error('Failed to get IndusLabs API key:', error)
    return null
  }
}

/**
 * Get callback URL from settings
 */
export async function getCallbackUrl(): Promise<string> {
  const client = createServerClient()
  
  try {
    const { data } = await client
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'callback_url')
      .single()
    
    return data?.setting_value || 'https://yourdomain.com/webhooks/ai-agents/indus'
  } catch {
    return 'https://yourdomain.com/webhooks/ai-agents/indus'
  }
}

/**
 * Get minimum call duration setting
 */
export async function getMinCallDuration(): Promise<number> {
  const client = createServerClient()
  
  try {
    const { data } = await client
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'min_call_duration')
      .single()
    
    return parseInt(data?.setting_value || '10', 10)
  } catch {
    return 10
  }
}

/**
 * Get active prompt version for agent
 */
export async function getActivePromptVersion(agentId: string) {
  const client = createServerClient()
  
  try {
    const { data } = await client
      .from('prompt_versions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    return data
  } catch (error) {
    console.error('Failed to get active prompt version:', error)
    return null
  }
}
