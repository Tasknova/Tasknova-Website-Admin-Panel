'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ProjectBrainPage from '@/components/ProjectBrainPage'
import { Plus, FolderKanban, CalendarDays, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  project_name: string
  description: string
  status: string
  created_at: string
  start_date: string | null
  end_date: string | null
}

export default function ProjectBrainAdminPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [newProject, setNewProject] = useState({
    project_name: '',
    description: '',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchCurrentAdmin()
    loadProjects()
  }, [])

  async function fetchCurrentAdmin() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (data.authenticated) {
        setCurrentAdmin(data.admin)
      }
    } catch (error) {
      console.error('Failed to fetch current admin:', error)
      toast.error('Authentication failed')
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch('/api/auth/session')
      const sessionData = await res.json()
      
      if (!sessionData.authenticated) {
        toast.error('Not authenticated')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', sessionData.admin.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function createProject() {
    if (!newProject.project_name.trim()) {
      toast.error('Project name is required')
      return
    }

    if (!currentAdmin) {
      toast.error('User not authenticated')
      return
    }

    setLoading(true)
    try {
      console.log('Creating project with data:', {
        company_id: currentAdmin.id,
        created_by: currentAdmin.id,
        project_name: newProject.project_name,
        description: newProject.description,
        start_date: newProject.start_date || null,
        end_date: newProject.end_date || null,
        status: 'active'
      })

      const { data, error } = await supabase
        .from('projects')
        .insert({
          company_id: currentAdmin.id,
          created_by: currentAdmin.id,
          project_name: newProject.project_name,
          description: newProject.description,
          start_date: newProject.start_date || null,
          end_date: newProject.end_date || null,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Project created:', data)
      toast.success('Project created successfully!')
      setProjects([data, ...projects])
      setShowNewProjectForm(false)
      setNewProject({ project_name: '', description: '', start_date: '', end_date: '' })
      setSelectedProjectId(data.id)
    } catch (error: any) {
      console.error('Error creating project:', error)
      toast.error(`Failed to create project: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (selectedProjectId) {
    return (
      <ProjectBrainPage
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Brain</h1>
        <p className="text-gray-600">Manage project-specific knowledge and embeddings</p>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={newProject.project_name}
                onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Project description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={newProject.end_date}
                  onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createProject}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
              <button
                onClick={() => setShowNewProjectForm(false)}
                disabled={loading}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Button */}
      {!showNewProjectForm && (
        <button
          onClick={() => setShowNewProjectForm(true)}
          className="mb-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {project.project_name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-100 text-green-700' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                {project.start_date && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

