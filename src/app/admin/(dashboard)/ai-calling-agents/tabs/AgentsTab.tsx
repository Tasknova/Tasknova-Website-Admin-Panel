'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronRight, RefreshCw, Clock } from 'lucide-react'

interface Agent {
  agent_id: string
  name: string
  total_calls: number
  valid_calls: number
  failed_calls: number
  avg_score: number
  created_at: string
}

interface SyncStatus {
  needs_sync: boolean
  last_sync: string | null
  next_sync_at: string | null
  time_until_next_sync_minutes: number
}

export default function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    initializeAgents()
  }, [])

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/ai-agents/check-sync-status')
      if (!response.ok) throw new Error('Failed to check sync status')
      const status = await response.json()
      setSyncStatus(status)
      if (status.last_sync) {
        setLastSyncTime(new Date(status.last_sync))
      }
      return status
    } catch (error) {
      console.error('Error checking sync status:', error)
      return null
    }
  }

  const initializeAgents = async () => {
    try {
      setLoading(true)
      
      // Check if sync is needed
      const status = await checkSyncStatus()
      
      if (status && status.needs_sync) {
        console.log('Auto-syncing agents (1 hour interval passed)')
        await syncFromIndusLabs(true)
      } else {
        // Just fetch from database
        await fetchAgents()
      }
    } catch (error) {
      console.error('Error initializing agents:', error)
      await fetchAgents()
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai-agents/index')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const result = await response.json()
      setAgents(result.agents || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      toast.error('Failed to load agents')
    }
  }

  const syncFromIndusLabs = async (isAutoSync = false) => {
    try {
      setSyncing(true)
      const response = await fetch('/api/ai-agents/sync-induslabs', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync agents')
      }
      const result = await response.json()
      setAgents(result.agents || [])
      
      // Update sync status
      await checkSyncStatus()
      
      if (!isAutoSync) {
        toast.success(`Synced ${result.synced_count} agents from IndusLabs`)
      }
    } catch (error) {
      console.error('Error syncing from IndusLabs:', error)
      if (!isAutoSync) {
        toast.error(error instanceof Error ? error.message : 'Failed to sync agents')
      }
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading agents...</div>
  }

  if (selectedAgent) {
    return (
      <AgentDetail agent={selectedAgent} onBack={() => setSelectedAgent(null)} />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
          {lastSyncTime && (
            <p className="text-xs text-gray-500 mt-1">
              Last synced: {lastSyncTime.toLocaleString()}
            </p>
          )}
          {syncStatus && syncStatus.time_until_next_sync_minutes > 0 && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Next auto-sync in {syncStatus.time_until_next_sync_minutes} min
            </p>
          )}
        </div>
        <button 
          onClick={() => syncFromIndusLabs(false)}
          disabled={syncing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Agents'}
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No agents found. Sync from IndusLabs to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <div
              key={agent.agent_id}
              onClick={() => setSelectedAgent(agent)}
              className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-600">ID: {agent.agent_id}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <MetricSmall label="Total Calls" value={agent.total_calls} />
                <MetricSmall label="Valid Calls" value={agent.valid_calls} color="text-green-600" />
                <MetricSmall label="Failed Calls" value={agent.failed_calls} color="text-red-600" />
                <MetricSmall label="Avg Score" value={agent.avg_score.toFixed(2)} color="text-purple-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentDetail({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [agent.agent_id])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai-agents/${agent.agent_id}/metrics`)
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const result = await response.json()
      setMetrics(result)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast.error('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
      >
        ← Back to Agents
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
        <p className="text-gray-600 mt-1">Agent ID: {agent.agent_id}</p>

        {loading ? (
          <div className="text-center py-8">Loading metrics...</div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            <MetricCard label="Total Calls" value={metrics.total_calls} />
            <MetricCard label="Valid Calls" value={metrics.valid_calls} />
            <MetricCard label="Failed Calls" value={metrics.failed_calls} />
            <MetricCard label="Invalid Calls" value={metrics.invalid_calls} />
            <MetricCard label="Completed" value={metrics.completed_calls} />
            <MetricCard label="Avg Score" value={metrics.avg_score.toFixed(2)} />
            <MetricCard label="Success Rate" value={`${metrics.success_rate}%`} />
            <MetricCard label="Avg Duration" value={`${metrics.avg_duration}s`} />
          </div>
        ) : (
          <div className="text-center py-8 text-red-600">Failed to load metrics</div>
        )}
      </div>
    </div>
  )
}

function MetricSmall({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
