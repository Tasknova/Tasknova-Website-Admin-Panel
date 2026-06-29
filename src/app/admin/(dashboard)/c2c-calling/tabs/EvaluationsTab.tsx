'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, ChevronRight, Loader2, RefreshCw } from 'lucide-react'

interface TranscriptTurn {
  role?: string
  speaker?: string
  content?: string
  text?: string
  message?: string
}

interface C2CTranscript {
  summary: string | null
  call_outcome: string | null
  history: TranscriptTurn[]
  raw_text: string | null
}

interface C2CEvaluation {
  id: string
  call_id: string
  status: 'processing' | 'completed' | 'failed'
  score: number | null
  overall_score: number | null
  overall_feedback: string | null
  call_summary: string | null
  customer_intent: string | null
  main_discussion_points: string[]
  strengths: string[]
  areas_for_improvement: string[]
  next_best_actions: string[]
  issues: string[]
  error_message: string | null
  processed_at: string | null
  transcript_text: string | null
  created_at: string
  c2c_calls: {
    call_id: string
    from_number: string
    to_number: string
    status: string
    duration: number
    created_at: string
    c2c_transcripts: C2CTranscript[] | null
  }
}

export default function EvaluationsTab({ isActive = true }: { isActive?: boolean }) {
  const [evaluations, setEvaluations] = useState<C2CEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<C2CEvaluation | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [reEvaluatingId, setReEvaluatingId] = useState<string | null>(null)

  const fetchEvaluations = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      params.append('_t', Date.now().toString())

      const res = await fetch(`/api/c2c/evaluations?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch evaluations')
      const result = await res.json()
      setEvaluations(result.evaluations || [])
    } catch (error) {
      console.error('[C2C Evaluations] Error:', error)
      if (showLoading) toast.error('Failed to load evaluations')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchEvaluations(true)
  }, [fetchEvaluations])

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => void fetchEvaluations(), 15000)
    return () => clearInterval(id)
  }, [fetchEvaluations, isActive])

  const handleReevaluate = async (ev: C2CEvaluation, e: React.MouseEvent) => {
    e.stopPropagation()
    if (reEvaluatingId) return
    setReEvaluatingId(ev.call_id)
    try {
      const res = await fetch(`/api/c2c/evaluations/${ev.call_id}/re-evaluate`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed')
      toast.success('Re-evaluation started! Refreshing in a moment...')
      setTimeout(() => void fetchEvaluations(), 3000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start re-evaluation')
    } finally {
      setReEvaluatingId(null)
    }
  }

  if (selected) {
    return (
      <EvaluationDetail
        evaluation={selected}
        onBack={() => setSelected(null)}
        onReEvaluate={(ev, e) => handleReevaluate(ev, e)}
        reEvaluatingId={reEvaluatingId}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 items-center flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-sm text-gray-500">{evaluations.length} evaluation(s)</span>
        <button
          onClick={() => void fetchEvaluations(true)}
          className="ml-auto px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading evaluations...</div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No evaluations found.</p>
          <p className="text-sm mt-1">Evaluations are auto-generated once a transcript is ready.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Call ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">From → To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Summary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(ev)}>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{ev.call_id.substring(0, 12)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{ev.c2c_calls?.from_number || '-'}</div>
                    <div className="text-gray-400">→ {ev.c2c_calls?.to_number || '-'}</div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={ev.status} /></td>
                  <td className="px-6 py-4"><ScoreBadge score={ev.overall_score ?? ev.score} status={ev.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{ev.call_summary || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(ev.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleReevaluate(ev, e)}
                        disabled={reEvaluatingId === ev.call_id || ev.status === 'processing'}
                        title="Re-evaluate this call"
                        className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {reEvaluatingId === ev.call_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Re-evaluate
                      </button>
                      <ChevronRight
                        className="w-4 h-4 text-gray-400 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EvaluationDetail({
  evaluation,
  onBack,
  onReEvaluate,
  reEvaluatingId,
}: {
  evaluation: C2CEvaluation
  onBack: () => void
  onReEvaluate: (ev: C2CEvaluation, e: React.MouseEvent) => void
  reEvaluatingId: string | null
}) {
  const transcript = Array.isArray(evaluation.c2c_calls?.c2c_transcripts)
    ? evaluation.c2c_calls.c2c_transcripts[0]
    : null
  const history = transcript?.history || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 font-medium">← Back to Evaluations</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: summary + transcript */}
        <div className="lg:col-span-2 space-y-6">
          {evaluation.call_summary && (
            <InfoCard title="Call Summary">
              <p className="text-sm text-gray-700">{evaluation.call_summary}</p>
            </InfoCard>
          )}
          {evaluation.customer_intent && (
            <InfoCard title="Customer Intent">
              <p className="text-sm text-gray-700">{evaluation.customer_intent}</p>
            </InfoCard>
          )}
          {evaluation.main_discussion_points?.length > 0 && (
            <InfoCard title="Main Discussion Points">
              <ul className="list-disc list-inside space-y-1">
                {evaluation.main_discussion_points.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700">{p}</li>
                ))}
              </ul>
            </InfoCard>
          )}
          {evaluation.next_best_actions?.length > 0 && (
            <InfoCard title="Next Best Actions">
              <ul className="list-disc list-inside space-y-1">
                {evaluation.next_best_actions.map((a, i) => (
                  <li key={i} className="text-sm text-blue-700">{a}</li>
                ))}
              </ul>
            </InfoCard>
          )}

          {/* Transcript Section */}
          <InfoCard title="Transcript">
            {history.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {history.map((turn, idx) => {
                  const speaker = turn.speaker || turn.role || 'Speaker'
                  const content = turn.content || turn.text || turn.message || ''
                  const isUser = speaker.toLowerCase().includes('user') || speaker.toLowerCase().includes('customer')
                  return (
                    <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm px-4 py-2 rounded-xl text-sm shadow-sm ${isUser ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                        <span className="text-xs font-semibold opacity-60 block mb-0.5">{speaker}</span>
                        {content}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : evaluation.transcript_text ? (
              <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{evaluation.transcript_text}</pre>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No transcript available for this call.</p>
            )}
          </InfoCard>
        </div>

        {/* Right col: score + strengths + improvements + info */}
        <div className="space-y-6">
          <InfoCard title="Score">
            <div className="text-center">
              <ScoreBadge score={evaluation.overall_score ?? evaluation.score} status={evaluation.status} />
            </div>
            {evaluation.overall_feedback && (
              <p className="text-sm text-gray-600 mt-3">{evaluation.overall_feedback}</p>
            )}
          </InfoCard>
          {evaluation.strengths?.length > 0 && (
            <InfoCard title="Strengths">
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700 flex gap-2"><span>✓</span>{s}</li>
                ))}
              </ul>
            </InfoCard>
          )}
          {evaluation.areas_for_improvement?.length > 0 && (
            <InfoCard title="Areas for Improvement">
              <ul className="space-y-1">
                {evaluation.areas_for_improvement.map((a, i) => (
                  <li key={i} className="text-sm text-orange-700 flex gap-2"><span>!</span>{a}</li>
                ))}
              </ul>
            </InfoCard>
          )}
          {evaluation.error_message && (
            <InfoCard title="Error">
              <p className="text-sm text-red-600">{evaluation.error_message}</p>
            </InfoCard>
          )}
          <InfoCard title="Call Info">
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">From:</span> {evaluation.c2c_calls?.from_number || '-'}</p>
              <p><span className="text-gray-500">To:</span> {evaluation.c2c_calls?.to_number || '-'}</p>
              <p><span className="text-gray-500">Date:</span> {new Date(evaluation.created_at).toLocaleString()}</p>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: C2CEvaluation['status'] }) {
  if (status === 'processing') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
      <Loader2 className="h-3 w-3 animate-spin" />Processing
    </span>
  )
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
      <AlertCircle className="h-3 w-3" />Failed
    </span>
  )
  return <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">Completed</span>
}

function ScoreBadge({ score, status }: { score: number | null; status: C2CEvaluation['status'] }) {
  if (status === 'processing') return <span className="text-sm text-blue-600">Processing...</span>
  if (status === 'failed') return <span className="text-sm text-red-600">N/A</span>
  if (typeof score !== 'number') return <span className="text-sm text-gray-400">-</span>
  const color = score >= 80 ? 'bg-green-100 text-green-800' : score >= 60 ? 'bg-blue-100 text-blue-800' : score >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
  return <span className={`px-2 py-1 rounded-full text-sm font-bold ${color}`}>{score.toFixed(1)}</span>
}
