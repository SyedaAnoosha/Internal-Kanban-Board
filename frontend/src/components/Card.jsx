import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCards } from '@/context/CardContext'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Check, Clock, Folder, Play, CheckCircle, Undo, Eye, Pencil } from 'lucide-react'

function getColumnStyle(colName) {
  switch (colName) {
    case 'Pipeline':
      return {
        bg: 'bg-c-pipeline-bg/70',
        text: 'text-c-pipeline-text border border-c-pipeline/15',
        accent: 'bg-c-pipeline',
        shadow: 'hover:shadow-[0_8px_24px_rgba(59,130,246,0.06)] hover:border-c-pipeline/30'
      }
    case 'In Progress':
      return {
        bg: 'bg-c-progress-bg/70',
        text: 'text-c-progress-text border border-c-progress/15',
        accent: 'bg-c-progress',
        shadow: 'hover:shadow-[0_8px_24px_rgba(245,158,11,0.06)] hover:border-c-progress/30'
      }
    case 'Under Review':
      return {
        bg: 'bg-c-review-bg/70',
        text: 'text-c-review-text border border-c-review/15',
        accent: 'bg-c-review',
        shadow: 'hover:shadow-[0_8px_24px_rgba(139,92,246,0.06)] hover:border-c-review/30'
      }
    case 'Done':
      return {
        bg: 'bg-c-done-bg/70',
        text: 'text-c-done-text border border-c-done/15',
        accent: 'bg-c-done',
        shadow: 'hover:shadow-[0_8px_24px_rgba(16,185,129,0.06)] hover:border-c-done/30'
      }
    default:
      return {
        bg: 'bg-bg-subtle',
        text: 'text-text-3 border border-border',
        accent: 'bg-text-4',
        shadow: 'hover:shadow-md hover:border-border-strong'
      }
  }
}

// FIX: Added isDraggingOverlay prop
export default function Card({ card, onClick, isPersonalBoard, isDraggingOverlay }) {
  const { getUserById, columns, updateCard, submitForReview, approveCard, requestChanges } = useCards()
  const { projects } = useProject()
  const { user } = useAuth()
  const { showToast } = useToast()

  const owner = card.owner_id ? getUserById(card.owner_id) : null
  const project = projects.find(p => p.id === card.project_id)
  const isAssignee = user?.id === card.owner_id
  const isAssigner = user?.id === card.assigned_by

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: card.id, 
    data: { card },
    disabled: isDraggingOverlay // Disable sortable logic for the overlay clone
  })

  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging && !isDraggingOverlay ? 0.3 : 1,
    // Premium styles for the floating overlay
    zIndex: isDraggingOverlay ? 9999 : undefined,
    boxShadow: isDraggingOverlay ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : undefined,
    cursor: isDraggingOverlay ? 'grabbing' : undefined,
    rotate: isDraggingOverlay ? '2deg' : undefined // Slight tilt for premium feel
  }

  async function handleAction(action) {
    try {
      if (action === 'start' || action === 'reopen') {
        const col = columns.find(c => c.name === 'In Progress')
        if (col) await updateCard(card.id, { column_id: col.id })
      } else if (action === 'submit') {
        await submitForReview(card.id)
      } else if (action === 'approve') {
        await approveCard(card.id)
      } else if (action === 'changes') {
        await requestChanges(card.id)
      } else if (action === 'back') {
        const col = columns.find(c => c.name === 'Pipeline')
        if (col) await updateCard(card.id, { column_id: col.id })
      }
      showToast('Task updated')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const getAvailableActions = () => {
    const actions = []
    if (currentColumn?.name === 'Pipeline') actions.push({ key: 'start', label: 'Start Task', icon: Play, variant: 'default' })
    if (currentColumn?.name === 'In Progress') {
      if (isAssignee) actions.push({ key: 'submit', label: 'Submit', icon: Eye, variant: 'default' })
      actions.push({ key: 'back', label: 'Move to Pipeline', icon: Undo, variant: 'ghost' })
    }
    if (currentColumn?.name === 'Under Review') {
      if (isAssigner) {
        actions.push({ key: 'approve', label: 'Approve', icon: CheckCircle, variant: 'success' })
        actions.push({ key: 'changes', label: 'Request Changes', icon: Undo, variant: 'warning' })
      }
    }
    if (currentColumn?.name === 'Done') actions.push({ key: 'reopen', label: 'Reopen', icon: Undo, variant: 'ghost' })
    return actions
  }

  const currentColumn = columns.find(col => col.id === card.column_id)
  const colName = currentColumn?.name || ''
  const colStyle = getColumnStyle(colName)
  const availableActions = getAvailableActions()

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      // FIX: Only apply drag listeners/attributes if it's NOT the overlay
      {...(isDraggingOverlay ? {} : attributes)}
      {...(isDraggingOverlay ? {} : listeners)}
      onClick={() => onClick(card)} 
      // FIX: Removed transition-all duration-300. 
      // transition-all animates width/height/padding during drag, causing severe lag.
      className={`relative group bg-surface border border-border/80 rounded-xl p-[18px] pl-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] ${colStyle.shadow} hover:-translate-y-0.5 transition-[transform,box-shadow,opacity,border-color] duration-200 cursor-pointer overflow-hidden`}
    >
      {/* Left side accent indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[5px] rounded-l-xl ${colStyle.accent}`} />

      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
        {project && (
          <div className="flex items-center gap-1.5 bg-bg-subtle/50 px-2 py-0.5 rounded-md border border-border/40 max-w-[65%] shrink-0">
            <Folder className="h-3 w-3 text-text-3 shrink-0" />
            <span className="text-[10px] font-medium text-text-2 truncate">{project.name}</span>
          </div>
        )}
        {isPersonalBoard && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colStyle.bg} ${colStyle.text}`}>
            {colName}
          </span>
        )}
      </div>

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold text-text-1 leading-snug flex-1 line-clamp-2 group-hover:text-primary transition-colors">
          {card.title}
        </h4>
        {!isDraggingOverlay && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 hover:bg-bg-subtle"
            onClick={(e) => {
              e.stopPropagation()
              onClick(card)
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-text-3 hover:text-text-1" />
          </Button>
        )}
      </div>

      {/* Description Preview */}
      {card.description && (
        <p className="text-xs text-text-3 line-clamp-2 mb-3.5 leading-relaxed">
          {card.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40 mb-3">
        <div className="flex items-center gap-2">
          {owner ? (
            <Avatar className="h-[22px] w-[22px] border border-surface shadow-xs">
              <AvatarFallback className="bg-primary-muted text-primary text-[10px] font-bold">
                {owner.full_name?.charAt(0) || owner.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-[22px] w-[22px] rounded-full bg-bg-subtle border border-border/80 flex items-center justify-center">
              <span className="text-[9px] font-bold text-text-4">?</span>
            </div>
          )}
          <span className="text-[11px] font-medium text-text-2 group-hover:text-text-1 transition-colors">
            {owner?.full_name || owner?.email?.split('@')[0] || 'Unassigned'}
          </span>
        </div>

        {card.completed_at ? (
          <div className="flex items-center gap-1 text-[10px] font-medium text-c-done-text bg-c-done-bg px-2 py-0.5 rounded-md border border-c-done/15">
            <Check className="h-3 w-3" />
            <span>Done</span>
          </div>
        ) : (
          card.updated_at && (
            <div className="flex items-center gap-1 text-[9px] text-text-4">
              <Clock className="h-3 w-3" />
              <span>{new Date(card.updated_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
            </div>
          )
        )}
      </div>

      {/* Quick Action Buttons */}
      {!isDraggingOverlay && availableActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-border/40" onClick={e => e.stopPropagation()}>
          {availableActions.map(action => {
            const isSuccess = action.variant === 'success'
            const isWarning = action.variant === 'warning'
            const isGhost = action.variant === 'ghost'
            return (
              <Button
                key={action.key}
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-lg text-[10.5px] font-semibold gap-1.5 transition-all duration-200 cursor-pointer ${
                  isSuccess 
                    ? 'bg-c-done-bg text-c-done-text hover:bg-c-done hover:text-white border border-c-done/15 shadow-xs' 
                    : isWarning
                    ? 'bg-c-progress-bg text-c-progress-text hover:bg-c-progress hover:text-white border border-c-progress/15 shadow-xs'
                    : isGhost
                    ? 'text-text-3 hover:text-text-1 hover:bg-bg-subtle border border-transparent'
                    : 'bg-primary-muted text-primary hover:bg-primary hover:text-white border border-primary/10 shadow-xs'
                }`}
                onClick={() => handleAction(action.key)}
              >
                <action.icon className="h-3 w-3 shrink-0" />
                {action.label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}