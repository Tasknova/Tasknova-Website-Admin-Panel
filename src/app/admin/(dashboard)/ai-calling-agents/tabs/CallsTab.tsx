'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Play, Pause, ChevronRight } from 'lucide-react'

interface Call {
  call_id: string
  agent_id: string
  status: string
  call_type: string
  duration: number
  recording_url: string
  transcript_status: string
  outcome: string
  created_at: string
  ai_agents: { name: string }
  ai_transcripts: [{ summary: string; call_outcome: string }]
  ai_evaluations: [{ score: number; issues: string[]; suggestions: string[] }]
}

export default function CallsTab() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [filters, setFilters] = useState({
    agent_id: '',
    status: '',
    call_type: '',
  })
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchCalls()
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

  const fetchCalls = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.agent_id) params.append('agent_id', filters.agent_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.call_type) params.append('call_type', filters.call_type)

      const response = await fetch(`/api/ai-agents/calls?${params}`)
      if (!response.ok) throw new Error('Failed to fetch calls')
      const result = await response.json()
      setCalls(result.calls || [])
    } catch (error) {
      console.error('Error fetching calls:', error)
      toast.error('Failed to load calls')
    } finally {
      setLoading(false)
    }
  }

  if (selectedCall) {
    return <CallDetail call={selectedCall} onBack={() => setSelectedCall(null)} />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 flex-wrap">
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

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={filters.call_type}
          onChange={(e) => setFilters({ ...filters, call_type: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="valid">Valid</option>
          <option value="failed">Failed</option>
          <option value="invalid">Invalid</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading calls...</div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No calls found with current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Call ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {calls.map((call) => (
                <tr
                  key={call.call_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCall(call)}
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{call.call_id.substring(0, 12)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{call.ai_agents?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{call.duration}s</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={call.status} />
                  </td>
                  <td className="px-6 py-4">
                    <TypeBadge type={call.call_type} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(call.created_at).toLocaleDateString()}
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

function CallDetail({ call, onBack }: { call: Call; onBack: () => void }) {
  const transcript = call.ai_transcripts?.[0]
  const evaluation = call.ai_evaluations?.[0]

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
      >
        ← Back to Calls
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Details & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900">Call Details</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <DetailItem label="Call ID" value={call.call_id} />
              <DetailItem label="Agent" value={call.ai_agents?.name || '-'} />
              <DetailItem label="Duration" value={`${call.duration}s`} />
              <DetailItem label="Status" value={call.status} />
              <DetailItem label="Type" value={call.call_type} />
              <DetailItem label="Created" value={new Date(call.created_at).toLocaleString()} />
            </div>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h3>
              <div className="space-y-3">
                {transcript.summary && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Summary:</p>
                    <p className="text-sm text-gray-600 mt-1">{transcript.summary}</p>
                  </div>
                )}
                {transcript.call_outcome && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Outcome:</p>
                    <p className="text-sm text-gray-600 mt-1">{transcript.call_outcome}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Recording & Evaluation */}
        <div className="space-y-6">
          {/* Recording */}
          {call.recording_url && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recording</h3>
              <audio controls className="w-full">
                <source src={call.recording_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Evaluation */}
          {evaluation && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation</h3>
              <div className="mb-4">
                <p className="text-3xl font-bold text-purple-600">{evaluation.score.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Evaluation Score</p>
              </div>

              {evaluation.issues && evaluation.issues.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 text-sm mb-2">Issues:</p>
                  <ul className="space-y-1">
                    {evaluation.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-red-600">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-gray-700 text-sm mb-2">Suggestions:</p>
                  <ul className="space-y-1">
                    {evaluation.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-green-600">
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: { [key: string]: string } = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: { [key: string]: string } = {
    valid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    invalid: 'bg-orange-100 text-orange-800',
    unknown: 'bg-gray-100 text-gray-800',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
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
