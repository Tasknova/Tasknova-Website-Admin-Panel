'use client'

import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import DeleteConfirm from '@/components/DeleteConfirm'
import { VoiceConversation } from '@/types'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Phone, Share2, Download } from 'lucide-react'

export default function VoiceConversationsPage() {
  const [conversations, setConversations] = useState<VoiceConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConvo, setSelectedConvo] = useState<VoiceConversation | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/voice-conversations')
      const data = await res.json()
      setConversations(data)
    } catch { // eslint-disable-next-line @typescript-eslint/no-unused-vars
      toast.error('Failed to fetch voice conversations')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedConvo) return

    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/voice-conversations?id=${selectedConvo.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Delete failed')

      toast.success('Voice conversation deleted')
      setDeleteModalOpen(false)
      setSelectedConvo(null)
      fetchConversations()
    } catch { // eslint-disable-next-line @typescript-eslint/no-unused-vars
      toast.error('Failed to delete voice conversation')
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = [
    { 
      key: 'customer_name', 
      label: 'Customer', 
      render: (val: string, row: VoiceConversation) => (
        <div>
          <div className="font-semibold text-gray-900">{val || <span className="text-gray-400 italic">No Customer Data</span>}</div>
          {row.customer_email && <div className="text-xs text-gray-500">{row.customer_email}</div>}
        </div>
      )
    },
    { 
      key: 'customer_phone', 
      label: 'Phone', 
      render: (val: string) => val ? (
        <span className="text-sm font-mono text-gray-700">{val}</span>
      ) : (
        <span className="text-gray-400 italic text-xs">Not provided</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusConfig: Record<string, { class: string; label: string }> = {
          'ended': { class: 'badge-success', label: 'Ended' },
          'queued': { class: 'badge-warning', label: 'Queued' },
          'in_progress': { class: 'badge-info', label: 'In Progress' },
          'failed': { class: 'badge-danger', label: 'Failed' },
        }
        const config = statusConfig[value] || { class: 'badge-warning', label: value || 'Unknown' }
        return (
          <span className={`badge ${config.class}`}>
            {config.label}
          </span>
        )
      },
    },
    {
      key: 'duration_seconds',
      label: 'Duration',
      render: (value: number) => value ? (
        <span className="text-sm font-medium text-gray-700">
          {Math.floor(value / 60)}m {value % 60}s
        </span>
      ) : '-',
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (value: number) => value ? (
        <span className="text-sm font-semibold text-green-600">
          ${value.toFixed(2)}
        </span>
      ) : '-',
    },
    {
      key: 'started_at',
      label: 'Date',
      render: (value: string) => value ? formatDateTime(value) : '-',
    },
  ]

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Phone className="w-10 h-10" />
          <h1 className="text-4xl font-bold">Voice Conversations</h1>
        </div>
        <p className="text-teal-100 text-lg">Manage voice call recordings and transcripts</p>
        
        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-teal-100 text-xs font-semibold uppercase">Total Calls</p>
            <p className="text-3xl font-bold mt-1">{conversations.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-teal-100 text-xs font-semibold uppercase">With Customer Data</p>
            <p className="text-3xl font-bold mt-1">{conversations.filter(c => c.customer_name).length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-teal-100 text-xs font-semibold uppercase">Status: Ended</p>
            <p className="text-3xl font-bold mt-1">{conversations.filter(c => c.status === 'ended').length}</p>
          </div>
        </div>
      </div>

      <DataTable
        data={conversations}
        columns={columns}
        onView={(row) => {
          setSelectedConvo(row)
          setViewModalOpen(true)
        }}
        onDelete={(row) => {
          setSelectedConvo(row)
          setDeleteModalOpen(true)
        }}
        searchKeys={['customer_name', 'customer_email', 'customer_phone']}
      />

      {/* View Modal */}
      {selectedConvo && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title="Voice Conversation Details"
          size="xl"
        >
          <div className="space-y-6">
            {/* Customer Info Section */}
            {(!selectedConvo.customer_name && !selectedConvo.customer_email && !selectedConvo.customer_phone) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">!</div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">No Customer Information Available</p>
                  <p className="text-xs text-amber-700 mt-1">This conversation does not have associated customer details.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Name</label>
                <p className="text-base font-medium text-gray-900">
                  {selectedConvo.customer_name || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                <p className="text-base text-gray-900">
                  {selectedConvo.customer_email || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                <p className="text-base text-gray-900">
                  {selectedConvo.customer_phone || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                <p className="mt-1">
                  <span className={`badge ${
                    selectedConvo.status === 'ended' ? 'badge-success' : 
                    selectedConvo.status === 'queued' ? 'badge-warning' :
                    selectedConvo.status === 'in_progress' ? 'badge-info' : 
                    selectedConvo.status === 'failed' ? 'badge-danger' :
                    'badge-warning'
                  }`}>
                    {selectedConvo.status === 'ended' ? 'Ended' : 
                     selectedConvo.status === 'queued' ? 'Queued' :
                     selectedConvo.status === 'in_progress' ? 'In Progress' :
                     selectedConvo.status === 'failed' ? 'Failed' :
                     selectedConvo.status || 'Unknown'}
                  </span>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</label>
                <p className="text-base font-medium text-gray-900">
                  {selectedConvo.duration_seconds 
                    ? `${Math.floor(selectedConvo.duration_seconds / 60)}m ${selectedConvo.duration_seconds % 60}s`
                    : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</label>
                <p className="text-base font-semibold text-green-600">{selectedConvo.cost ? `$${selectedConvo.cost.toFixed(2)}` : '-'}</p>
              </div>
            </div>

            {selectedConvo.recording_url && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                <label className="text-sm font-semibold text-teal-900 mb-3 block">Recording</label>
                <div className="space-y-3">
                  <audio controls className="w-full">
                    <source src={selectedConvo.recording_url} />
                    Your browser does not support the audio element.
                  </audio>
                  <a
                    href={selectedConvo.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-teal-700 hover:text-teal-900 font-medium text-sm transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Recording
                  </a>
                </div>
              </div>
            )}

            {selectedConvo.web_call_url && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                <label className="text-sm font-semibold text-blue-900 mb-3 block">Web Call Link</label>
                <div className="space-y-3">
                  <a
                    href={selectedConvo.web_call_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Open Call Link
                  </a>
                </div>
              </div>
            )}

            {selectedConvo.transcript && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Transcript</label>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedConvo.transcript}</p>
                </div>
              </div>
            )}

            {selectedConvo.summary && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Summary</label>
                <p className="text-base text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">{selectedConvo.summary}</p>
              </div>
            )}

            {selectedConvo.lead_details && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Lead Details</label>
                <p className="text-base text-gray-600 leading-relaxed bg-green-50 p-4 rounded-lg border border-green-100">{selectedConvo.lead_details}</p>
              </div>
            )}

            {selectedConvo.analysis && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">AI Analysis</label>
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-xl overflow-auto max-h-64 border border-gray-700">
                  {JSON.stringify(selectedConvo.analysis, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirm
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Voice Conversation"
        message="Are you sure you want to delete this voice conversation? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  )
}


