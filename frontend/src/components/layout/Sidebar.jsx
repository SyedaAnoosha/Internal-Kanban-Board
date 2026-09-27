import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProject } from '@/context/ProjectContext'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  LayoutDashboard, User, History, Bell, Folder, Plus, ChevronDown, 
  LogOut, Rocket, Check, X 
} from 'lucide-react'

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, invitations, createProject, acceptInvitation, declineInvitation } = useProject()
  
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [respondingTo, setRespondingTo] = useState(null)

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  async function handleLogout() {
    await logout()
    navigate('/login')
    if (onClose) onClose()
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    try {
      const project = await createProject(newProjectName, '')
      setNewProjectName('')
      setShowCreateDialog(false)
      navigate(`/projects/${project.id}/board`)
      if (onClose) onClose()
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

  // Helper for nav link styling
  const navLinkClass = (active) => `
    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
    ${active 
      ? 'bg-sidebar-active-bg text-sidebar-active-text' 
      : 'text-sidebar-text hover:bg-sidebar-surface hover:text-sidebar-text-hover'
    }
  `

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Rocket className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold text-sidebar-text-hover tracking-tight">ERM Workspace</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link to="/dashboard" className={navLinkClass(isActive('/dashboard'))} onClick={onClose}>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
        <Link to="/personal" className={navLinkClass(isActive('/personal'))} onClick={onClose}>
          <User className="w-4 h-4" /> Personal Board
        </Link>
        <Link to="/history" className={navLinkClass(isActive('/history'))} onClick={onClose}>
          <History className="w-4 h-4" /> Monthly History
        </Link>
        <Link to="/notifications" className={navLinkClass(isActive('/notifications'))} onClick={onClose}>
          <Bell className="w-4 h-4" /> Notifications
        </Link>

        {/* ── Invitations ── */}
        {invitations.length > 0 && (
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-sidebar-text-muted uppercase tracking-wider mb-2">
              Invitations ({invitations.length})
            </p>
            <div className="space-y-1">
              {invitations.map(invite => (
                <div key={invite.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-sidebar-surface">
                  <span className="text-xs text-sidebar-text truncate flex-1 mr-2">{invite.project_name}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:bg-green-400/10" onClick={() => handleInvitationResponse(invite.id, 'accept')} disabled={respondingTo === invite.id}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:bg-red-400/10" onClick={() => handleInvitationResponse(invite.id, 'decline')} disabled={respondingTo === invite.id}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Projects (Collapsible) ── */}
        <div className="pt-4">
          <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-xs font-semibold text-sidebar-text-muted uppercase tracking-wider">Projects</p>
              <div className="flex items-center gap-1">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-sidebar-text-muted hover:text-sidebar-text-hover hover:bg-sidebar-surface">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[300px]">
                    <DialogHeader>
                      <DialogTitle>Create Project</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
                      <Input 
                        placeholder="e.g., Website Redesign" 
                        value={newProjectName} 
                        onChange={e => setNewProjectName(e.target.value)} 
                        autoFocus 
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button type="submit">Create</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-sidebar-text-muted hover:text-sidebar-text-hover hover:bg-sidebar-surface">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="space-y-1">
              {projects.length === 0 ? (
                <p className="px-3 text-xs text-sidebar-text-muted italic">No projects yet</p>
              ) : (
                projects.map(project => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}/board`} 
                    className={navLinkClass(location.pathname.startsWith(`/projects/${project.id}`))}
                    onClick={onClose}
                  >
                    <Folder className="w-4 h-4" /> 
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>

      {/* ── User Footer ── */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-surface">
          <Avatar className="h-8 w-8 border border-sidebar-border">
            <AvatarFallback className="bg-primary/20 text-sidebar-active-text text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-text-hover truncate">{user?.email}</p>
            <p className="text-[10px] text-sidebar-text-muted">Member</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-text-muted hover:text-red-400 hover:bg-red-400/10" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}