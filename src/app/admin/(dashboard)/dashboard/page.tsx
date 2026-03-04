'use client'

import { useEffect, useState } from 'react'
import { createServerClient } from '@/lib/supabase'
import { DashboardStats } from '@/types'
import { 
  FileText, 
  Users, 
  Briefcase, 
  BookOpen, 
  Library, 
  FileCheck, 
  Phone, 
  MessageSquare 
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentDemos, setRecentDemos] = useState<any[]>([])
  const [recentApplicants, setRecentApplicants] = useState<any[]>([])
  const [recentVoiceCalls, setRecentVoiceCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      const data = await res.json()
      
      setStats(data.stats)
      setRecentDemos(data.recentDemos)
      setRecentApplicants(data.recentApplicants)
      setRecentVoiceCalls(data.recentVoiceCalls)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  const statCards = [
    { name: 'Demo Requests', value: stats?.totalDemoRequests || 0, icon: FileText, gradient: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', href: '/admin/demo-requests' },
    { name: 'Job Applicants', value: stats?.totalJobApplicants || 0, icon: Users, gradient: 'from-green-500 to-emerald-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', href: '/admin/job-applicants' },
    { name: 'Active Jobs', value: stats?.activeJobOpenings || 0, icon: Briefcase, gradient: 'from-purple-500 to-pink-500', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', href: '/admin/job-openings' },
    { name: 'Published Blogs', value: stats?.publishedBlogs || 0, icon: BookOpen, gradient: 'from-pink-500 to-rose-500', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', href: '/admin/blogs' },
    { name: 'Playbooks', value: stats?.totalPlaybooks || 0, icon: Library, gradient: 'from-indigo-500 to-purple-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', href: '/admin/playbooks' },
    { name: 'Industry Reports', value: stats?.totalReports || 0, icon: FileCheck, gradient: 'from-orange-500 to-amber-500', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', href: '/admin/industry-reports' },
    { name: 'Voice Calls', value: stats?.totalVoiceConversations || 0, icon: Phone, gradient: 'from-teal-500 to-cyan-500', iconBg: 'bg-teal-100', iconColor: 'text-teal-600', href: '/admin/voice-conversations' },
    { name: 'Chat Sessions', value: stats?.totalChatConversations || 0, icon: MessageSquare, gradient: 'from-cyan-500 to-blue-500', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', href: '/admin/chat-conversations' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-primary-100 text-lg">Welcome back! Here's your platform overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="stat-card group"
            style={{animationDelay: `${index * 0.1}s`}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.iconBg} p-3 rounded-xl transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className={`w-7 h-7 ${stat.iconColor}`} />
              </div>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.gradient}`}></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <div className={`h-1 rounded-full bg-gradient-to-r ${stat.gradient} opacity-50`} style={{width: '60%'}}></div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Demo Requests */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Demo Requests</h2>
            <FileText className="w-5 h-5 text-primary-500" />
          </div>
          <div className="space-y-3">
            {recentDemos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No demo requests yet</p>
            ) : (
              recentDemos.map((demo: any) => (
                <div key={demo.id} className="flex justify-between items-start p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{demo.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{demo.company}</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{formatDate(demo.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Job Applicants */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Job Applicants</h2>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-3">
            {recentApplicants.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No applicants yet</p>
            ) : (
              recentApplicants.map((applicant: any) => (
                <div key={applicant.id} className="flex justify-between items-start p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{applicant.full_name}</p>
                    <p className="text-xs text-gray-600 mt-1">{applicant.email}</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{formatDate(applicant.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Voice Conversations */}
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Voice Conversations</h2>
          <Phone className="w-5 h-5 text-teal-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentVoiceCalls.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-sm text-gray-500 text-center">
                    No voice conversations yet
                  </td>
                </tr>
              ) : (
                recentVoiceCalls.map((call: any) => (
                  <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{call.customer_name || <span className="text-gray-400 italic">No customer data</span>}</div>
                      {call.customer_email && <div className="text-xs text-gray-500">{call.customer_email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        call.status === 'ended' ? 'badge-success' : 
                        call.status === 'queued' ? 'badge-warning' :
                        call.status === 'in_progress' ? 'badge-info' : 
                        'badge-warning'
                      }`}>
                        {call.status === 'ended' ? 'Ended' : 
                         call.status === 'queued' ? 'Queued' :
                         call.status === 'in_progress' ? 'In Progress' :
                         call.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(call.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
