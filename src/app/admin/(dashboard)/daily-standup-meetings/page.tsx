'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, CalendarDays, Clock3, CheckCircle2, AlertTriangle } from 'lucide-react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import { DailyStandupMeeting } from '@/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DailyStandupMeetingsPage() {
  const [meetings, setMeetings] = useState<DailyStandupMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<DailyStandupMeeting | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/admin/daily-standup-meetings')
      if (!res.ok) throw new Error('Request failed')

      const data = await res.json()
      setMeetings(data || [])
    } catch (error) {
      toast.error('Failed to fetch daily standup meetings')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'meeting_title',
      label: 'Meeting',
      render: (value: string, row: DailyStandupMeeting) => (
        <div>
          <div className="font-semibold text-gray-900">{value || 'Daily Standup'}</div>
          <div className="text-xs text-gray-500">ID: {row.id.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      key: 'meeting_date',
      label: 'Meeting Date',
      render: (value: string) => (value ? formatDate(value) : '-'),
    },
    {
      key: 'meeting_duration',
      label: 'Duration',
      render: (value: number) => (typeof value === 'number' ? `${value} min` : '-'),
    },
    {
      key: 'processed',
      label: 'Processed',
      render: (value: boolean) => (
        <span className={`badge ${value ? 'badge-success' : 'badge-warning'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value: string) => formatDateTime(value),
    },
  ]

  if (loading) {
    return <div className="text-center py-12">Loading daily standup meetings...</div>
  }

  const processedCount = meetings.filter((item) => item.processed).length
  const failedCount = meetings.filter((item) => item.processing_error).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="w-10 h-10" />
          <h1 className="text-4xl font-bold">Daily Standup Meetings</h1>
        </div>
        <p className="text-cyan-100 text-lg">Review standup meeting records and processing state</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-cyan-100 text-xs font-semibold uppercase">Total Meetings</p>
            <p className="text-3xl font-bold mt-1">{meetings.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-cyan-100 text-xs font-semibold uppercase">Processed</p>
            <p className="text-3xl font-bold mt-1">{processedCount}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-cyan-100 text-xs font-semibold uppercase">With Errors</p>
            <p className="text-3xl font-bold mt-1">{failedCount}</p>
          </div>
        </div>
      </div>

      <DataTable
        data={meetings}
        columns={columns}
        onView={(row) => {
          setSelectedMeeting(row)
          setViewModalOpen(true)
        }}
        searchKeys={['meeting_title', 'meeting_date', 'processing_error']}
      />

      {selectedMeeting && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title="Standup Meeting Details"
          size="xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Meeting Date</p>
                <p className="text-base font-semibold text-gray-900">{selectedMeeting.meeting_date ? formatDate(selectedMeeting.meeting_date) : '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock3 className="w-3 h-3" /> Duration</p>
                <p className="text-base font-semibold text-gray-900">
                  {typeof selectedMeeting.meeting_duration === 'number' ? `${selectedMeeting.meeting_duration} min` : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Processed Status</p>
                <p>
                  {selectedMeeting.processed ? (
                    <span className="inline-flex items-center gap-1 badge badge-success"><CheckCircle2 className="w-3 h-3" />Processed</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 badge badge-warning"><AlertTriangle className="w-3 h-3" />Pending</span>
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Processed At</p>
                <p className="text-base font-semibold text-gray-900">{selectedMeeting.processed_at ? formatDateTime(selectedMeeting.processed_at) : '-'}</p>
              </div>
            </div>

            {selectedMeeting.processing_error && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-sm font-bold text-red-900 mb-2">Processing Error</p>
                <p className="text-sm text-red-800 whitespace-pre-wrap">{selectedMeeting.processing_error}</p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-2">Meeting Summary (JSON)</p>
              <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(selectedMeeting.meeting_summary ?? {}, null, 2)}
              </pre>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-2">Transcript (JSON)</p>
              <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(selectedMeeting.meeting_transcript ?? {}, null, 2)}
              </pre>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-2">Memory Context Analysis (JSON)</p>
              <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(selectedMeeting.memory_context_analysis ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
