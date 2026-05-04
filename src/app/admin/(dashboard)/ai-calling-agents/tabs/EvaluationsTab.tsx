'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronRight } from 'lucide-react'

interface Evaluation {
  id: string
  call_id: string
  score: number
  issues: string[]
  suggestions: string[]
  created_at: string
  ai_calls: {
    call_id: string
    agent_id: string
    call_type: string
    duration: number
    created_at: string
    ai_agents: { name: string }
  }
}

export default function EvaluationsTab() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null)
  const [filters, setFilters] = useState({
    min_score: '',
    max_score: '',
    agent_id: '',
  })
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchEvaluations()
  }, [filters])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai-agents/index')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const result = await response.json()
      setAgents(result.agents || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchEvaluations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.min_score) params.append('min_score', filters.min_score)
      if (filters.max_score) params.append('max_score', filters.max_score)
      if (filters.agent_id) params.append('agent_id', filters.agent_id)

      const response = await fetch(`/api/ai-agents/evaluations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch evaluations')
      const result = await response.json()
      setEvaluations(result.evaluations || [])
    } catch (error) {
      console.error('Error fetching evaluations:', error)
      toast.error('Failed to load evaluations')
    } finally {
      setLoading(false)
    }
  }

  if (selectedEval) {
    return <EvaluationDetail eval={selectedEval} onBack={() => setSelectedEval(null)} />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 flex-wrap">
        <input
          type="number"
          min="0"
          max="100"
          placeholder="Min Score"
          value={filters.min_score}
          onChange={(e) => setFilters({ ...filters, min_score: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
        />

        <input
          type="number"
          min="0"
          max="100"
          placeholder="Max Score"
          value={filters.max_score}
          onChange={(e) => setFilters({ ...filters, max_score: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
        />

        <select
          value={filters.agent_id}
          onChange={(e) => setFilters({ ...filters, agent_id: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Agents</option>
          {agents.map((agent) => (
            <option key={agent.agent_id} value={agent.agent_id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading evaluations...</div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No evaluations found with current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Call ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Issues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {evaluations.map((evaluation) => (
                <tr
                  key={evaluation.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEval(evaluation)}
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{evaluation.call_id.substring(0, 12)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{evaluation.ai_calls?.ai_agents?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <ScoreBadge score={evaluation.score} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {evaluation.issues?.length || 0} issues
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(evaluation.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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

function EvaluationDetail({ eval: evaluation, onBack }: { eval: Evaluation; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
      >
        ← Back to Evaluations
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900">Evaluation Details</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <DetailItem label="Call ID" value={evaluation.call_id} />
              <DetailItem label="Agent" value={evaluation.ai_calls?.ai_agents?.name || '-'} />
              <DetailItem label="Call Type" value={evaluation.ai_calls?.call_type || '-'} />
              <DetailItem label="Duration" value={`${evaluation.ai_calls?.duration || 0}s`} />
              <DetailItem label="Created" value={new Date(evaluation.created_at).toLocaleString()} />
            </div>
          </div>

          {/* Issues */}
          {evaluation.issues && evaluation.issues.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues Found</h3>
              <ul className="space-y-2">
                {evaluation.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-red-600 font-bold">•</span>
                    <span className="text-sm text-red-800">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {evaluation.suggestions && evaluation.suggestions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggestions</h3>
              <ul className="space-y-2">
                {evaluation.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm text-green-800">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Score Sidebar */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
            <p className="text-sm text-gray-600 mb-2">Evaluation Score</p>
            <p className="text-5xl font-bold text-purple-600">{evaluation.score.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-2">out of 100</p>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${evaluation.score}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {evaluation.score >= 80
                  ? '🟢 Excellent'
                  : evaluation.score >= 60
                    ? '🟡 Good'
                    : evaluation.score >= 40
                      ? '🟠 Fair'
                      : '🔴 Needs Improvement'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  let bgColor = 'bg-red-100 text-red-800'
  if (score >= 80) bgColor = 'bg-green-100 text-green-800'
  else if (score >= 60) bgColor = 'bg-blue-100 text-blue-800'
  else if (score >= 40) bgColor = 'bg-yellow-100 text-yellow-800'

  return (
    <span className={`px-2 py-1 rounded-full text-sm font-bold ${bgColor}`}>
      {score.toFixed(1)}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="text-sm text-gray-900 mt-1">{value}</p>
    </div>
  )
}
