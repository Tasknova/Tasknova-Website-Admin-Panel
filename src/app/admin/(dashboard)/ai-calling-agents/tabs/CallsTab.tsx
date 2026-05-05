'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronRight, Phone, Send } from 'lucide-react'
import { Agent } from '@/types'

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
  const [selectedCallDetails, setSelectedCallDetails] = useState<Call | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [filters, setFilters] = useState({
    agent_id: '',
    status: '',
    call_type: '',
  })
  const [agents, setAgents] = useState<Agent[]>([])

  // Initiate call form state
  const [customerNumber, setCustomerNumber] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [organizationDid, setOrganizationDid] = useState('')
  const [initiatingCall, setInitiatingCall] = useState(false)
  const [callResponse, setCallResponse] = useState<{
    call_id: string
    call_status: string
    message: string
  } | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)

  // Agent config form state (for Collection Bot)
  const [agentConfig, setAgentConfig] = useState({
    customer_name: '',
    jewellery_shop_name: '',
    pending_amount: '',
    last_call_date: '',
  })

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

  const fetchCallDetails = async (callId: string) => {
    try {
      setLoadingDetails(true)
      const response = await fetch(`/api/ai-agents/calls/${callId}`)
      if (!response.ok) throw new Error('Failed to fetch call details')
      const result = await response.json()
      setSelectedCallDetails(result.call)
    } catch (error) {
      console.error('Error fetching call details:', error)
      toast.error('Failed to load call details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const retryTranscriptStatus = async (callId: string) => {
    try {
      const response = await fetch(`/api/ai-agents/calls/${callId}/transcript-status`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to check transcript status')
      const result = await response.json()
      setSelectedCallDetails(result.call)
      toast.success('Transcript status updated')
    } catch (error) {
      console.error('Error retrying transcript status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check transcript status')
    }
  }

  const handleInitiateCall = async () => {
    if (!customerNumber.trim() || !selectedAgent || !organizationDid.trim()) {
      toast.error('Please fill in all required fields: customer number, agent, and organization DID')
      return
    }

    try {
      setInitiatingCall(true)
      
      // Build request body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestBody: any = {
        customer_number: customerNumber.trim(),
        agent_id: selectedAgent,
        did: organizationDid.trim(),
        transcript: true,
        transcript_language: 'en',
      }

      // Add agent_config if any fields are filled
      const hasAgentConfig = Object.values(agentConfig).some(val => val.trim() !== '')
      if (hasAgentConfig) {
        requestBody.agent_config = {}
        if (agentConfig.customer_name.trim()) requestBody.agent_config.customer_name = agentConfig.customer_name.trim()
        if (agentConfig.jewellery_shop_name.trim()) requestBody.agent_config.jewellery_shop_name = agentConfig.jewellery_shop_name.trim()
        if (agentConfig.pending_amount.trim()) requestBody.agent_config.pending_amount = agentConfig.pending_amount.trim()
        if (agentConfig.last_call_date.trim()) requestBody.agent_config.last_call_date = agentConfig.last_call_date.trim()
      }

      console.log('Sending initiate call request:', requestBody)

      // Create abort controller with 30 second timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('/api/ai-agents/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('Response status:', response.status, response.statusText)
      const result = await response.json()
      console.log('Response data:', result)

      if (!response.ok) {
        throw new Error(result.error || `API error: ${response.statusText}`)
      }

      // Show status modal with the response
      setCallResponse({
        call_id: result.call_id,
        call_status: result.call_status,
        message: result.message,
      })
      setShowStatusModal(true)

      // Only clear form and refresh if successful
      if (result.call_status === 'success') {
        setCustomerNumber('')
        setSelectedAgent('')
        setOrganizationDid('')
        setAgentConfig({
          customer_name: '',
          jewellery_shop_name: '',
          pending_amount: '',
          last_call_date: '',
        })
        toast.success(`Call initiated! ID: ${result.call_id}`)
        
        // Refresh calls list after a delay
        setTimeout(() => {
          fetchCalls()
        }, 1000)
      } else {
        toast.error(`Call initiation failed with status: ${result.call_status}`)
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timeout - call initiation took too long. Please try again.')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error('Failed to initiate call')
      }
    } finally {
      setInitiatingCall(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchCalls()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  if (selectedCall) {
    return (
      <CallDetail 
        call={selectedCallDetails} 
        loading={loadingDetails}
        onBack={() => {
          setSelectedCall(null)
          setSelectedCallDetails(null)
        }}
        onRetryTranscript={() => selectedCallDetails && retryTranscriptStatus(selectedCallDetails.call_id)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Call Status Modal */}
      {showStatusModal && callResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              {callResponse.call_status === 'success' ? (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className={`text-xl font-semibold text-center mb-2 ${
              callResponse.call_status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {callResponse.call_status === 'success' ? 'Call Initiated Successfully!' : 'Call Initiation Failed'}
            </h3>

            <p className="text-center text-gray-600 mb-4">
              {callResponse.message}
            </p>

            <div className="bg-gray-50 rounded p-3 mb-6">
              <p className="text-xs text-gray-600 mb-1">Call ID:</p>
              <p className="text-sm font-mono text-gray-900 break-all">{callResponse.call_id}</p>
            </div>

            <div className="bg-gray-50 rounded p-3 mb-6">
              <p className="text-xs text-gray-600 mb-1">Status:</p>
              <p className="text-sm font-semibold">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  callResponse.call_status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {callResponse.call_status.toUpperCase()}
                </span>
              </p>
            </div>

            <button
              onClick={() => {
                setShowStatusModal(false)
                setCallResponse(null)
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Initiate Call Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Initiate New Call</h2>
        </div>

        <div className="space-y-4">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Number*
              </label>
              <input
                type="tel"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="e.g., 9175442260 (91 added auto)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={initiatingCall}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent*
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={initiatingCall}
              >
                <option value="">Choose an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.agent_id} value={agent.agent_id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization DID*
              </label>
              <input
                type="tel"
                value={organizationDid}
                onChange={(e) => setOrganizationDid(e.target.value)}
                placeholder="e.g., 919484956750"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={initiatingCall}
              />
            </div>

            <button
              onClick={handleInitiateCall}
              disabled={initiatingCall || !customerNumber.trim() || !selectedAgent || !organizationDid.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {initiatingCall ? 'Initiating...' : 'Make Call'}
            </button>
          </div>

          {/* Agent Config Fields - Conditional for Collection Bot */}
          {selectedAgent && agents.find(a => a.agent_id === selectedAgent)?.name.toLowerCase().includes('collection') && (
            <div className="bg-white rounded-lg border border-blue-300 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Collection Bot Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={agentConfig.customer_name}
                    onChange={(e) => setAgentConfig({ ...agentConfig, customer_name: e.target.value })}
                    placeholder="e.g., Raj"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={initiatingCall}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jewellery Shop Name
                  </label>
                  <input
                    type="text"
                    value={agentConfig.jewellery_shop_name}
                    onChange={(e) => setAgentConfig({ ...agentConfig, jewellery_shop_name: e.target.value })}
                    placeholder="e.g., Tanishq"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={initiatingCall}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pending Amount
                  </label>
                  <input
                    type="text"
                    value={agentConfig.pending_amount}
                    onChange={(e) => setAgentConfig({ ...agentConfig, pending_amount: e.target.value })}
                    placeholder="e.g., 15000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={initiatingCall}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Call Date
                  </label>
                  <input
                    type="date"
                    value={agentConfig.last_call_date}
                    onChange={(e) => {
                      console.log('Date input changed to:', e.target.value)
                      setAgentConfig({ ...agentConfig, last_call_date: e.target.value })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={initiatingCall}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Call History Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Call History</h3>

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
                  onClick={() => {
                    setSelectedCall(call)
                    fetchCallDetails(call.call_id)
                  }}
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
    </div>
  )
}

function CallDetail({ call, loading, onBack, onRetryTranscript }: { call: Call | null; loading?: boolean; onBack: () => void; onRetryTranscript?: () => void }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
        >
          ← Back to Calls
        </button>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-4">
              <div className="animate-spin">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600">Loading call details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
        >
          ← Back to Calls
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Call details not found</p>
        </div>
      </div>
    )
  }

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

          {/* Transcript Status & Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcript Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Status:</p>
                  <div className="flex items-center gap-2 mt-2">
                    {call.transcript_status === 'completed' && (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      </>
                    )}
                    {call.transcript_status === 'pending' && (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </>
                    )}
                    {call.transcript_status === 'failed' && (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Failed
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {call.transcript_status === 'pending' && (
                  <button
                    onClick={onRetryTranscript}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    Check Status
                  </button>
                )}
                {call.transcript_status === 'failed' && (
                  <button
                    onClick={onRetryTranscript}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                  >
                    Retry
                  </button>
                )}
              </div>
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
