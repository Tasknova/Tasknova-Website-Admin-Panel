'use client'

import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import DeleteConfirm from '@/components/DeleteConfirm'
import { JobApplicant } from '@/types'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ExternalLink, Users } from 'lucide-react'

export default function JobApplicantsPage() {
  const [applicants, setApplicants] = useState<JobApplicant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplicant, setSelectedApplicant] = useState<JobApplicant | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date_desc')

  useEffect(() => {
    fetchApplicants()
  }, [])

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/admin/job-applicants')
      const data = await res.json()
      setApplicants(data)
    } catch (error) {
      toast.error('Failed to fetch job applicants')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedApplicant) return

    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/job-applicants?id=${selectedApplicant.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Delete failed')

      toast.success('Applicant deleted')
      setDeleteModalOpen(false)
      setSelectedApplicant(null)
      fetchApplicants()
    } catch (error) {
      toast.error('Failed to delete applicant')
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'experience_years', label: 'Experience (Years)' },
    {
      key: 'ai_score',
      label: 'AI Score',
      render: (value: number) => (
        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
          value >= 80 ? 'bg-green-100 text-green-800' :
          value >= 60 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value ? `${value}/100` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Applied',
      render: (value: string) => formatDate(value),
    },
  ]

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  // Filter and sort data
  const filteredAndSortedData = applicants
    .filter(applicant => {
      if (scoreFilter === 'high') return applicant.ai_score >= 80
      if (scoreFilter === 'medium') return applicant.ai_score >= 60 && applicant.ai_score < 80
      if (scoreFilter === 'low') return applicant.ai_score < 60
      return true
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'date_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc': return a.full_name.localeCompare(b.full_name)
        case 'name_desc': return b.full_name.localeCompare(a.full_name)
        case 'score_desc': return b.ai_score - a.ai_score
        case 'score_asc': return a.ai_score - b.ai_score
        default: return 0
      }
    })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-10 h-10" />
          <h1 className="text-4xl font-bold">Job Applicants</h1>
        </div>
        <p className="text-purple-100 text-lg">Manage job applications</p>
        
        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-xs font-semibold uppercase">Total Applicants</p>
            <p className="text-3xl font-bold mt-1">{applicants.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-xs font-semibold uppercase">High Score (≥80)</p>
            <p className="text-3xl font-bold mt-1">{applicants.filter(a => a.ai_score >= 80).length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-xs font-semibold uppercase">Avg Score</p>
            <p className="text-3xl font-bold mt-1">{applicants.length ? Math.round(applicants.reduce((sum, a) => sum + a.ai_score, 0) / applicants.length) : 0}</p>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by AI Score</label>
            <select 
              value={scoreFilter} 
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Applicants</option>
              <option value="high">High Score (≥80)</option>
              <option value="medium">Medium Score (60-79)</option>
              <option value="low">Low Score (&lt;60)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="score_desc">Score (High to Low)</option>
              <option value="score_asc">Score (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        data={filteredAndSortedData}
        columns={columns}
        onView={(row) => {
          setSelectedApplicant(row)
          setViewModalOpen(true)
        }}
        onDelete={(row) => {
          setSelectedApplicant(row)
          setDeleteModalOpen(true)
        }}
        searchKeys={['full_name', 'email']}
      />

      {/* View Modal */}
      {selectedApplicant && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title="Applicant Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 font-semibold">{selectedApplicant.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1">{selectedApplicant.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1">{selectedApplicant.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Experience</label>
                <p className="mt-1">{selectedApplicant.experience_years} years</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">AI Score</label>
                <p className="mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                    selectedApplicant.ai_score >= 80 ? 'bg-green-100 text-green-800' :
                    selectedApplicant.ai_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedApplicant.ai_score ? `${selectedApplicant.ai_score}/100` : 'N/A'}
                  </span>
                </p>
              </div>
            </div>

            {selectedApplicant.portfolio_url && (
              <div>
                <label className="text-sm font-medium text-gray-700">Portfolio</label>
                <a
                  href={selectedApplicant.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center text-primary-600 hover:underline"
                >
                  {selectedApplicant.portfolio_url} <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            )}

            {selectedApplicant.resume_url && (
              <div>
                <label className="text-sm font-medium text-gray-700">Resume</label>
                <a
                  href={selectedApplicant.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center text-primary-600 hover:underline"
                >
                  View Resume <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            )}

            {selectedApplicant.linkedin_url && (
              <div>
                <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                <a
                  href={selectedApplicant.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center text-primary-600 hover:underline"
                >
                  {selectedApplicant.linkedin_url} <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            )}

            {selectedApplicant.cover_letter && (
              <div>
                <label className="text-sm font-medium text-gray-700">Cover Letter</label>
                <p className="mt-1 text-gray-600 whitespace-pre-wrap">{selectedApplicant.cover_letter}</p>
              </div>
            )}

            {selectedApplicant.ai_score_reasoning && (
              <div>
                <label className="text-sm font-medium text-gray-700">AI Score Reasoning</label>
                <p className="mt-1 text-gray-600">{selectedApplicant.ai_score_reasoning}</p>
              </div>
            )}

            {selectedApplicant.linkedin_scraped_data && (
              <div>
                <label className="text-sm font-medium text-gray-700">LinkedIn Data (Scraped)</label>
                <pre className="mt-1 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(selectedApplicant.linkedin_scraped_data, null, 2)}
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
        title="Delete Applicant"
        message="Are you sure you want to delete this applicant? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  )
}
