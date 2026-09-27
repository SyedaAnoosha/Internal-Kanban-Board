import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import { useState } from 'react'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, invitations, createProject, acceptInvitation, declineInvitation } = useProject()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [respondingTo, setRespondingTo] = useState(null)

  async function handleLogout() {
    await logout()
    navigate('/login')
    onClose()
  }

  function handleNavClick() {
    if (window.innerWidth < 768) onClose()
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    try {
      const project = await createProject(newProjectName, '')
      setNewProjectName('')
      setShowCreateModal(false)
      navigate(`/projects/${project.id}/board`)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleInvitationResponse(invitationId, action) {
    setRespondingTo(invitationId)
    try {
      if (action === 'accept') await acceptInvitation(invitationId)
      else await declineInvitation(invitationId)
    } catch (err) {
      alert(err.message)
    } finally {
      setRespondingTo(null)
    }
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const navBtnStyle = (active) => ({
    background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5625rem 0.75rem',
    borderRadius: 'var(--radius-md)', textDecoration: 'none',
    color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
    backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
    fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: active ? '600' : '500'
  })

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
            </div>
            <div>
              <h1 className="sidebar-logo-title">ERM</h1>
              <p className="sidebar-logo-subtitle">Kanban</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" style={navBtnStyle(isActive('/dashboard'))} onClick={handleNavClick}>
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>

          <Link to="/personal" style={navBtnStyle(isActive('/personal'))} onClick={handleNavClick}>
            <span className="material-symbols-outlined">person</span>
            <span>Personal Board</span>
          </Link>

          {/* Pending Invitations — only shown when there are any */}
          {invitations.length > 0 && (
            <>
              <div className="sidebar-section-header">
                <span>Invitations ({invitations.length})</span>
              </div>
              {invitations.map(invite => (
                <div key={invite.id} className="sidebar-invitation-item">
                  <span className="sidebar-item-text" title={invite.project_name}>
                    {invite.project_name}
                  </span>
                  <div className="sidebar-invitation-actions">
                    <button
                      type="button"
                      className="btn-xs btn-primary"
                      disabled={respondingTo === invite.id}
                      onClick={() => handleInvitationResponse(invite.id, 'accept')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-xs btn-secondary"
                      disabled={respondingTo === invite.id}
                      onClick={() => handleInvitationResponse(invite.id, 'decline')}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="sidebar-section-header">
            <span>Projects</span>
            <button onClick={() => setShowCreateModal(true)} className="sidebar-add-btn" aria-label="Create project">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            </button>
          </div>

          {projects.length === 0 && (
            <p style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--sidebar-text-muted)' }}>
              No projects yet
            </p>
          )}

          {projects.map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/board`}
              style={navBtnStyle(location.pathname.startsWith(`/projects/${project.id}`))}
              onClick={handleNavClick}
            >
              <span className="material-symbols-outlined">folder</span>
              <span className="sidebar-item-text">{project.name}</span>
            </Link>
          ))}

          <div className="sidebar-bottom-nav">
            <Link to="/history" style={navBtnStyle(isActive('/history'))} onClick={handleNavClick}>
              <span className="material-symbols-outlined">history</span>
              <span>Monthly History</span>
            </Link>
            {/* <Link to="/notifications" style={navBtnStyle(isActive('/notifications'))} onClick={handleNavClick}>
              <span className="material-symbols-outlined">notifications</span>
              <span>Notifications</span>
            </Link> */}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-email">{user?.email}</p>
              <p className="sidebar-user-role">Member</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '20rem' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close-btn">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="modal-form">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input className="form-input" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g., Website Redesign" autoFocus />
              </div>
              <div className="modal-form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
