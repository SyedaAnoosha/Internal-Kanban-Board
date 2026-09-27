import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const ProjectContext = createContext(null)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function ProjectProvider({ children }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [invitations, setInvitations] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) setProjects(await res.json())
  }, [])

  const fetchInvitations = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/projects/invitations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) setInvitations(await res.json())
  }, [])

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      Promise.all([fetchProjects(), fetchInvitations()]).finally(() => setLoading(false))
    } else {
      setProjects([])
      setInvitations([])
      setLoading(true)
    }
  }, [user, fetchProjects, fetchInvitations])

  async function createProject(name, description) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/projects/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description })
    })
    if (!res.ok) throw new Error('Failed to create project')

    const newProject = await res.json()
    await fetchProjects()
    return newProject
  }

  const respondToInvitation = useCallback(async (invitationId, action) => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/projects/invitations/${invitationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to respond to invitation')
    }
    // Refresh both lists: an accepted invite should now show up as a project
    await Promise.all([fetchInvitations(), fetchProjects()])
  }, [fetchInvitations, fetchProjects])

  const acceptInvitation = useCallback((id) => respondToInvitation(id, 'accept'), [respondToInvitation])
  const declineInvitation = useCallback((id) => respondToInvitation(id, 'decline'), [respondToInvitation])

  return (
    <ProjectContext.Provider value={{
      projects, invitations, activeProjectId, setActiveProjectId, loading,
      createProject, fetchProjects, fetchInvitations,
      acceptInvitation, declineInvitation,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject must be used within ProjectProvider')
  return context
}
