import { useState, useEffect } from 'react'
import { useCards } from '@/context/CardContext'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  Folder, X, Trash2, Loader2, User, Briefcase, 
  Clock, FileText, CheckCircle2, ArrowRight, Plus 
} from 'lucide-react'

// ── Helpers ──
function timeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const getEventDetails = (event, users) => {
  const actorName = event.actor?.full_name || event.actor?.email?.split('@')[0] || 'Someone'
  const fromCol = event.from_column?.name
  const toCol = event.to_column?.name
  
  switch (event.event_type) {
    case 'created':
      return {
        icon: Plus,
        iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
        text: <span><strong className="text-text-1 font-semibold">{actorName}</strong> created this task</span>
      }
    case 'moved':
      return {
        icon: ArrowRight,
        iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
        text: (
          <span>
            <strong className="text-text-1 font-semibold">{actorName}</strong> moved from <span className="font-semibold text-text-2 bg-bg-subtle px-1.5 py-0.5 rounded text-[11px]">{fromCol || 'unknown'}</span> to <span className="font-semibold text-text-2 bg-bg-subtle px-1.5 py-0.5 rounded text-[11px]">{toCol || 'unknown'}</span>
          </span>
        )
      }
    case 'assigned': {
      const newOwnerId = event.metadata?.new_owner_id
      const newOwner = users.find(u => u.id === newOwnerId)
      const newOwnerName = newOwner?.full_name || newOwner?.email?.split('@')[0] || 'unassigned'
      return {
        icon: User,
        iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600',
        text: <span><strong className="text-text-1 font-semibold">{actorName}</strong> assigned to <strong className="text-text-1 font-semibold">{newOwnerName}</strong></span>
      }
    }
    case 'submitted_review':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-600',
        text: <span><strong className="text-text-1 font-semibold">{actorName}</strong> submitted for review</span>
      }
    case 'approved':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
        text: <span><strong className="text-text-1 font-semibold">{actorName}</strong> approved this task</span>
      }
    case 'rejected':
      return {
        icon: ArrowRight,
        iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
        text: <span><strong className="text-text-1 font-semibold">{actorName}</strong> requested changes</span>
      }
    default:
      return {
        icon: Clock,
        iconBg: 'bg-gray-100 border-gray-200 text-gray-600',
        text: <span><strong className="text-text-1 font-semibold">{actorName}</strong> performed action</span>
      }
  }
}

export default function CardModal({ open, onOpenChange, card, columnId, projectId }) {
  const { createCard, updateCard, deleteCard, users, columns, getCardEvents, getUserById } = useCards()
  const { projects } = useProject()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const isEditing = !!card
  const isPersonalBoard = !projectId
  
  const project = projects.find(p => p.id === (card?.project_id || projectId || selectedProjectId))
  const creator = card?.created_by ? getUserById(card.created_by) : null

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      if (card) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(card.title || '')
        setDescription(card.description || '')
        setOwnerId(card.owner_id || '')
        setStatusId(card.column_id || '')
        setSelectedProjectId(card.project_id || '')
        
        setEventsLoading(true)
        getCardEvents(card.id)
          .then(data => setEvents(data || []))
          .catch(err => console.error('Error fetching events:', err))
          .finally(() => setEventsLoading(false))
      } else {
        setTitle('')
        setDescription('')
        setOwnerId(user?.id || '')
        setStatusId(columnId || '')
        setSelectedProjectId(projectId || '')
        setEvents([])
      }
    }
  }, [open, card, columnId, projectId, user, getCardEvents])

  async function handleSubmit() {
    if (!title.trim()) return showToast('Title is required', 'error')
    const targetProjectId = isEditing ? card.project_id : (isPersonalBoard ? selectedProjectId : projectId)
    if (!isEditing && isPersonalBoard && !targetProjectId) return showToast('Please select a project', 'error')

    setLoading(true)
    try {
      if (isEditing) {
        const payload = { title, description: description || null, owner_id: ownerId || null }
        if (statusId && statusId !== card.column_id) payload.column_id = statusId
        await updateCard(card.id, payload)
        showToast('Task updated')
      } else {
        await createCard({
          title, description: description || null, column_id: columnId || statusId,
          owner_id: ownerId || user.id, project_id: targetProjectId, position: 0,
        })
        showToast('Task created')
      }
      onOpenChange(false)
    } catch (err) {
      showToast(err.message || 'An error occurred', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this task?')) return
    setLoading(true)
    try {
      await deleteCard(card.id)
      showToast('Task deleted')
      onOpenChange(false)
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] p-0 gap-0 flex flex-col bg-surface border-border/80 [&>button:last-child]:hidden">
        
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-subtle/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10 shrink-0">
              <Folder className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-text-3 uppercase tracking-wider">
                <span>{project?.name || 'Personal Board'}</span>
                {statusId && (
                  <>
                    <span className="text-text-4">/</span>
                    <span className="text-primary">{columns.find(c => c.id === statusId)?.name || 'Task'}</span>
                  </>
                )}
              </div>
              <h2 className="text-base font-bold text-text-1 leading-tight mt-0.5">
                {isEditing ? 'Task Details' : 'Create New Task'}
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-bg-subtle" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 text-text-2" />
          </Button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* 1. Title */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Title
            </Label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="text-lg font-semibold border-border bg-surface rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/10" 
              placeholder="Write a descriptive task title..." 
              disabled={loading}
            />
          </div>

          {/* 2. Description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Description
            </Label>
            <Textarea 
              value={description || ''} 
              onChange={e => setDescription(e.target.value)} 
              className="min-h-[140px] border-border bg-surface rounded-lg px-4 py-3 resize-y focus:border-primary focus:ring-2 focus:ring-primary/10" 
              placeholder="Add description, context, or links..." 
              disabled={loading}
            />
          </div>

          {/* 3. Properties */}
          <div className="bg-bg-subtle/40 border border-border rounded-xl p-5 space-y-5">
            <h3 className="text-xs font-bold text-text-2 uppercase tracking-wider border-b border-border pb-3 mb-1">
              Properties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Status
                </Label>
                <Select value={statusId} onValueChange={setStatusId} disabled={loading}>
                  <SelectTrigger className="bg-surface border-border rounded-lg h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Assignee
                </Label>
                <Select value={ownerId || 'none'} onValueChange={val => setOwnerId(val === 'none' ? '' : val)} disabled={loading}>
                  <SelectTrigger className="bg-surface border-border rounded-lg h-10">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-sm text-text-3">Unassigned</span>
                    </SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 border border-surface">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-text-1">
                            {u.full_name || u.email.split('@')[0]}
                            {u.id === user?.id && <span className="text-text-4 ml-1.5 text-[10px] font-normal">(You)</span>}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5" /> Project
              </Label>
              {!isEditing && isPersonalBoard ? (
                <Select value={selectedProjectId || 'none'} onValueChange={val => setSelectedProjectId(val === 'none' ? '' : val)} disabled={loading}>
                  <SelectTrigger className="bg-surface border-border rounded-lg h-10">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-sm text-text-3">No Project</span>
                    </SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-text-3" />
                          <span className="text-sm font-medium text-text-1">{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm font-semibold text-text-1">
                  <Folder className="h-4 w-4 text-text-3" />
                  <span>{project?.name || 'Personal Board'}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Task Metadata */}
          {isEditing && (
            <div className="bg-bg-subtle/40 border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-text-2 uppercase tracking-wider border-b border-border pb-3 mb-1">
                Task Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creator && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Created By</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-surface">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                          {creator.full_name?.charAt(0) || creator.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold text-text-1 truncate">
                        {creator.full_name || creator.email.split('@')[0]}
                      </span>
                    </div>
                  </div>
                )}
                {card.created_at && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Date Created</span>
                    <span className="text-sm font-semibold text-text-1">
                      {new Date(card.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                )}
                {card.completed_at && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Completed</span>
                    <div className="flex items-center gap-1.5 text-c-done-text font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {new Date(card.completed_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Activity Log */}
          {isEditing && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-text-2 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" /> Activity Log
              </h3>

              {eventsLoading ? (
                <div className="flex items-center justify-center py-8 text-text-3 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Loading activity...</span>
                </div>
              ) : events.length > 0 ? (
                <div className="relative pl-8 space-y-6">
                  {/* Vertical line */}

                  {events.map((event) => {
                    const details = getEventDetails(event, users)
                    const IconComponent = details.icon
                    return (
                      <div key={event.id} className="relative group">
                        {/* Icon Node */}
                        <div className={`absolute -left-8 top-0 h-6 w-6 rounded-md flex items-center justify-center border shadow-sm ${details.iconBg} z-10 transition-transform duration-200 group-hover:scale-110`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="text-sm text-text-2 leading-relaxed">
                            {details.text}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-text-4 font-semibold">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo(event.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-text-3 py-6 px-4 bg-bg-subtle/40 border border-dashed border-border rounded-lg justify-center">
                  <Clock className="h-4 w-4 text-text-4" />
                  <span>No activity yet</span>
                </div>
              )}
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div className="pt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            <div>
              {isEditing && (
                <Button 
                  variant="outline" 
                  onClick={handleDelete} 
                  disabled={loading} 
                  className="text-error hover:bg-error-bg hover:text-error-text border-error/20 hover:border-error/30"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} 
                  Delete Task
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none bg-primary hover:bg-primary-hover text-white">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}