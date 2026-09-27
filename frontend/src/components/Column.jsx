import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCards } from '@/context/CardContext'
import Card from './Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Inbox } from 'lucide-react'

export default function Column({ column, onCardClick, onAddClick, isMobileActive, isPersonalBoard }) {
  const { getCardsByColumn } = useCards()
  const cards = getCardsByColumn(column.id)
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className={`flex flex-col w-full md:w-80 shrink-0 ${isMobileActive ? '' : 'hidden md:flex'}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 py-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-2">
            {column.name}
          </h3>
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4 text-text-3 border-border-strong bg-transparent">
            {cards.length}
          </Badge>
        </div>
        {onAddClick && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-text-3 hover:text-text-1" onClick={() => onAddClick(column.id)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Drop Zone */}
      <div 
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 rounded-lg transition-colors min-h-[200px] ${
          isOver ? 'bg-bg-subtle/50 ring-1 ring-dashed ring-border-strong' : ''
        }`}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-md">
              <Inbox className="h-5 w-5 text-text-3 mb-2" />
              <p className="text-xs text-text-3 font-medium">No tasks</p>
            </div>
          ) : (
            cards.map(card => (
              <Card 
                key={card.id} 
                card={card} 
                onClick={onCardClick} 
                isPersonalBoard={isPersonalBoard} 
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}