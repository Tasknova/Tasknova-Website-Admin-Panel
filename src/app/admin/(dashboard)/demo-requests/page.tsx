'use client'

import { useEffect, useState } from 'react'
import { FileText, Mail, MailCheck, Building2, User, Clock, Globe, Calendar, MapPin } from 'lucide-react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import DeleteConfirm from '@/components/DeleteConfirm'
import { DemoRequest } from '@/types'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DemoRequestsPage() {
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [mailFilter, setMailFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date_desc')

  useEffect(() => {
    fetchDemoRequests()
  }, [])

  const fetchDemoRequests = async () => {
    try {
      const res = await fetch('/api/admin/demo-requests')
      const data = await res.json()
      setDemoRequests(data)
    } catch { // eslint-disable-next-line @typescript-eslint/no-unused-vars
      toast.error('Failed to fetch demo requests')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDemo) return

    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/demo-requests?id=${selectedDemo.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Delete failed')

      toast.success('Demo request deleted')
      setDeleteModalOpen(false)
      setSelectedDemo(null)
      fetchDemoRequests()
    } catch { // eslint-disable-next-line @typescript-eslint/no-unused-vars
      toast.error('Failed to delete demo request')
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (val: string, row: DemoRequest) => (
        <div>
          <div className="font-semibold text-gray-900">{val}</div>
          <div className="text-xs text-gray-500">{row.email}</div>
        </div>
      )
    },
    { 
      key: 'company', 
      label: 'Company',
      render: (val: string, row: DemoRequest) => (
        <div>
          <div className="font-medium text-gray-900">{val}</div>
          <div className="text-xs text-gray-500">{row.role}</div>
        </div>
      )
    },
    { key: 'team_size', label: 'Team Size' },
    {
      key: 'mail_sent',
      label: 'Mail Sent',
      render: (value: boolean) => (
        <span className={`badge ${value ? 'badge-success' : 'badge-warning'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value: string) => formatDate(value),
    },
  ]

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  // Filter and sort data
  const filteredAndSortedData = demoRequests
    .filter(demo => {
      if (mailFilter === 'sent') return demo.mail_sent === true
      if (mailFilter === 'pending') return demo.mail_sent === false
      return true
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'date_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'name_desc': return b.name.localeCompare(a.name)
        case 'company_asc': return a.company.localeCompare(b.company)
        case 'company_desc': return b.company.localeCompare(a.company)
        default: return 0
      }
    })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-10 h-10" />
          <h1 className="text-4xl font-bold">Demo Requests</h1>
        </div>
        <p className="text-blue-100 text-lg">Manage demo booking requests</p>
        
        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-xs font-semibold uppercase">Total Requests</p>
            <p className="text-3xl font-bold mt-1">{demoRequests.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-xs font-semibold uppercase">Mail Sent</p>
            <p className="text-3xl font-bold mt-1">{demoRequests.filter(d => d.mail_sent).length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-xs font-semibold uppercase">Pending</p>
            <p className="text-3xl font-bold mt-1">{demoRequests.filter(d => !d.mail_sent).length}</p>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Mail Status</label>
            <select 
              value={mailFilter} 
              onChange={(e) => setMailFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Requests</option>
              <option value="sent">Mail Sent</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="company_asc">Company (A-Z)</option>
              <option value="company_desc">Company (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        data={filteredAndSortedData}
        columns={columns}
        onView={(row) => {
          setSelectedDemo(row)
          setViewModalOpen(true)
        }}
        onDelete={(row) => {
          setSelectedDemo(row)
          setDeleteModalOpen(true)
        }}
        searchKeys={['name', 'email', 'company']}
      />

      {/* View Modal */}
      {selectedDemo && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title="Demo Request Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> Name
                  </label>
                  <p className="text-base font-semibold text-gray-900">{selectedDemo.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <p className="text-base text-gray-900">{selectedDemo.email}</p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Company
                  </label>
                  <p className="text-base font-semibold text-gray-900">{selectedDemo.company}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> Role
                  </label>
                  <p className="text-base text-gray-900">{selectedDemo.role}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Team Size</label>
                  <p className="text-base font-medium text-gray-900">{selectedDemo.team_size}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Website
                  </label>
                  {selectedDemo.company_website ? (
                    <a href={selectedDemo.company_website} target="_blank" rel="noopener noreferrer" className="text-base text-primary-600 hover:text-primary-800 hover:underline">
                      {selectedDemo.company_website}
                    </a>
                  ) : (
                    <p className="text-base text-gray-500">-</p>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduling Information */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduling Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Preferred Date
                  </label>
                  <p className="text-base font-medium text-gray-900">{selectedDemo.preferred_date || '-'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Preferred Time
                  </label>
                  <p className="text-base font-medium text-gray-900">{selectedDemo.preferred_time || '-'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Timezone
                  </label>
                  <p className="text-base font-medium text-gray-900">{selectedDemo.timezone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wider flex items-center gap-1">
                    {selectedDemo.mail_sent ? <MailCheck className="w-3 h-3" /> : <Mail className="w-3 h-3" />} Mail Sent
                  </label>
                  <p className="mt-1">
                    <span className={`badge ${selectedDemo.mail_sent ? 'badge-success' : 'badge-warning'}`}>
                      {selectedDemo.mail_sent ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedDemo.notes && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <label className="text-sm font-bold text-amber-900 mb-3 block flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Notes
                </label>
                <p className="text-base text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-amber-100">{selectedDemo.notes}</p>
              </div>
            )}

            {/* Company Info */}
            {selectedDemo.company_scraped_info && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-300">
                <label className="text-sm font-bold text-gray-900 mb-3 block flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Company Info (Scraped)
                </label>
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-xl overflow-auto max-h-64 border border-gray-700 leading-relaxed">
                  {JSON.stringify(selectedDemo.company_scraped_info, null, 2)}
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
        title="Delete Demo Request"
        message="Are you sure you want to delete this demo request? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  )
}


