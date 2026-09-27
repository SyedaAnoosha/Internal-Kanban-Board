import { useState, useEffect } from 'react'
// FIX: Changed closestCorners to closestCenter
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useCards } from '@/context/CardContext'
import { useToast } from '@/components/Toast'
import Column from './Column'
import Card from './Card'
import CardModal from './CardModal'
import { Skeleton } from '@/components/ui/skeleton'

function BoardSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="w-72 shrink-0 space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Board({ projectId = null }) {
  // FIX: Destructure moveCard
  const { columns, cards, moveCard, loading, error, refetch } = useCards()
  const { showToast } = useToast()
  const [modalState, setModalState] = useState({ open: false, card: null, columnId: null })
  const [activeMobileColumn, setActiveMobileColumn] = useState(null)
  
  // NEW: State for the DragOverlay
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => {
    if (columns.length > 0 && !activeMobileColumn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveMobileColumn(columns[0].id)
    }
  }, [columns, activeMobileColumn])

  useEffect(() => {
    const handleGlobalNewTask = () => {
      if (columns.length > 0) {
        setModalState({ open: true, card: null, columnId: columns[0].id })
      } else {
        showToast('Columns are still loading — try again in a moment', 'error')
      }
    }
    
    window.addEventListener('erm:new-task', handleGlobalNewTask)
    return () => window.removeEventListener('erm:new-task', handleGlobalNewTask)
  }, [columns, showToast])

  // FIX: Increased distance to 8px to prevent accidental drags when clicking
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // NEW: Handle drag start to show overlay
  function handleDragStart(event) {
    const { active } = event
    const card = cards.find(c => c.id === active.id)
    setActiveCard(card)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveCard(null) // Hide overlay
    if (!over || active.id === over.id) return

    const activeCardData = cards.find((c) => c.id === active.id)
    if (!activeCardData) return

    const overColumn = columns.find((col) => col.id === over.id)
    const overCard = cards.find((c) => c.id === over.id)

    let targetColumnId, newIndex

    if (overColumn) {
      targetColumnId = overColumn.id
      // If dropping in empty space, add to the end
      newIndex = cards.filter(c => c.column_id === targetColumnId && c.id !== active.id).length
    } else if (overCard) {
      targetColumnId = overCard.column_id
      const targetColumnCards = cards.filter(c => c.column_id === targetColumnId && c.id !== active.id)
      newIndex = targetColumnCards.findIndex(c => c.id === over.id)
      
      if (newIndex === -1) newIndex = targetColumnCards.length
    } else return

    // Only move if the column or position actually changed
    const oldIndex = cards.filter(c => c.column_id === activeCardData.column_id).findIndex(c => c.id === active.id)
    if (activeCardData.column_id !== targetColumnId || oldIndex !== newIndex) {
      moveCard(active.id, targetColumnId, newIndex)
        .then(() => showToast('Card moved'))
        .catch((err) => showToast(err.message, 'error'))
    }
  }

  // NEW: Handle drag cancel
  function handleDragCancel() {
    setActiveCard(null)
  }

  function openCreateModal(columnId) {
    if (!columnId) return showToast('Columns are still loading', 'error')
    setModalState({ open: true, card: null, columnId })
  }

  function openEditModal(card) {
    setModalState({ open: true, card, columnId: card.column_id })
  }

  function closeModal() {
    setModalState({ open: false, card: null, columnId: null })
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-sm text-error-text font-medium">Connection Lost</p>
          <p className="text-xs text-text-3">{error}</p>
          <button onClick={refetch} className="text-xs font-semibold text-primary hover:underline">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Column Tabs */}
      {columns.length > 0 && (
        <div className="md:hidden sticky top-14 z-20 bg-surface border-b border-border p-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={() => setActiveMobileColumn(col.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeMobileColumn === col.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-text-3 hover:bg-bg-subtle'
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Board Content */}
      <main className="flex-1 overflow-x-auto p-4 md:p-6">
        {loading ? (
          <BoardSkeleton />
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} // FIX: Changed from closestCorners
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex gap-6 min-w-max md:min-w-0 h-full">
              {columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  onCardClick={openEditModal}
                  onAddClick={openCreateModal}
                  isMobileActive={activeMobileColumn === column.id}
                  isPersonalBoard={!projectId}
                />
              ))}
            </div>

            {/* NEW: DragOverlay for premium smooth dragging */}
            <DragOverlay>
              {activeCard ? (
                <Card 
                  card={activeCard} 
                  isPersonalBoard={!projectId} 
                  isDraggingOverlay 
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Workspace Modal */}
      <CardModal 
        open={modalState.open} 
        onOpenChange={(open) => !open && closeModal()} 
        card={modalState.card} 
        columnId={modalState.columnId} 
        projectId={projectId} 
      />
    </>
  )
}