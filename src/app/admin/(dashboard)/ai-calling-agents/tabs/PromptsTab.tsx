'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronRight, Plus, Copy } from 'lucide-react'

interface PromptVersion {
  id: string
  agent_id: string
  version: string
  prompt_text: string
  is_active: boolean
  performance_score: number
  call_count: number
  created_at: string
}

export default function PromptsTab() {
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    fetchAgents()
    fetchPrompts()
  }, [])

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

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-agents/prompt-versions')
      if (!response.ok) throw new Error('Failed to fetch prompts')
      const result = await response.json()
      setPrompts(result.prompt_versions || [])
    } catch (error) {
      console.error('Error fetching prompts:', error)
      toast.error('Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  if (showCreate) {
    return (
      <CreatePromptForm
        agents={agents}
        onSuccess={() => {
          setShowCreate(false)
          fetchPrompts()
        }}
        onCancel={() => setShowCreate(false)}
      />
    )
  }

  if (selectedPrompt) {
    return (
      <PromptDetail
        prompt={selectedPrompt}
        onBack={() => setSelectedPrompt(null)}
        onRefresh={fetchPrompts}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Prompt Versions</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Prompt
        </button>
      </div>

      <p className="text-sm text-gray-600">
        💡 IndusLabs API does not support prompt updates. Manage prompt versions internally for tracking and optimization.
      </p>

      {loading ? (
        <div className="text-center py-8">Loading prompts...</div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No prompt versions yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => setSelectedPrompt(prompt)}
              className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">Version {prompt.version}</h3>
                    {prompt.is_active && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {agents.find((a) => a.agent_id === prompt.agent_id)?.name || prompt.agent_id}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <MetricSmall label="Performance" value={prompt.performance_score?.toFixed(1) || '-'} />
                <MetricSmall label="Calls" value={prompt.call_count} />
                <MetricSmall label="Created" value={new Date(prompt.created_at).toLocaleDateString()} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CreatePromptForm({
  agents,
  onSuccess,
  onCancel,
}: {
  agents: any[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    agent_id: '',
    version: '',
    prompt_text: '',
    is_active: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.agent_id || !formData.version || !formData.prompt_text) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/ai-agents/prompt-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create prompt')
      toast.success('Prompt created successfully')
      onSuccess()
    } catch (error) {
      console.error('Error creating prompt:', error)
      toast.error('Failed to create prompt')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
      >
        ← Back to Prompts
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-gray-900">Create Prompt Version</h2>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
            <select
              value={formData.agent_id}
              onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent.agent_id} value={agent.agent_id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="e.g., 1.0.0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Text</label>
            <textarea
              value={formData.prompt_text}
              onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
              placeholder="Enter your prompt text..."
              required
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Set as active prompt
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating...' : 'Create Prompt'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PromptDetail({ prompt, onBack, onRefresh }: { prompt: PromptVersion; onBack: () => void; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
      >
        ← Back to Prompts
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Version {prompt.version}</h2>
          {prompt.is_active && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-600">Performance Score</p>
            <p className="text-2xl font-bold text-gray-900">{prompt.performance_score?.toFixed(1) || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900">{prompt.call_count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Created</p>
            <p className="text-sm text-gray-900">{new Date(prompt.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Prompt Text</h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {prompt.prompt_text}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricSmall({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
