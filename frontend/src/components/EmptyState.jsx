import { Button } from '@/components/ui/button'
import { Inbox } from 'lucide-react'

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  actionLabel, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg bg-surface/50">
      <div className="h-12 w-12 rounded-full bg-bg-subtle flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-text-3" />
      </div>
      <h3 className="text-sm font-semibold text-text-1 mb-1">{title}</h3>
      <p className="text-xs text-text-3 max-w-xs mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}