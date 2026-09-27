import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarIcon } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function ProjectHistory({ projectId }) {
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const headers = { Authorization: `Bearer ${token}` }
        
        const [monthsRes, cardsRes] = await Promise.all([
          fetch(`${API_BASE}/history/months?project_id=${projectId}`, { headers }),
          fetch(`${API_BASE}/history/?project_id=${projectId}${selectedMonth !== 'all' ? `&month=${selectedMonth}` : ''}`, { headers })
        ])

        if (isMounted) {
          if (monthsRes.ok) setMonths(await monthsRes.json())
          if (cardsRes.ok) setCards(await cardsRes.json())
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => { isMounted = false }
  }, [selectedMonth, projectId])

  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text-1">Project History</h2>
          <p className="text-sm text-text-3 mt-0.5">Review finished tasks and milestones for this project.</p>
        </div>
        <select
          className="h-9 px-3 rounded-md border border-border bg-surface text-sm font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          disabled={loading}
        >
          <option value="all">All Months</option>
          {months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg bg-surface">
          <CalendarIcon className="h-8 w-8 text-text-3 mb-3" />
          <p className="text-sm font-medium text-text-1">No history found</p>
          <p className="text-xs text-text-3 mt-1">Complete tasks in this project to see them here.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-border ml-2 space-y-6">
          {cards.map((card, ) => (
            <div key={card.id} className="relative pl-8">
              {/* Timeline Dot */}
              <div className="absolute -left-[7px] top-2 h-4 w-4 rounded-full border-4 border-bg-base shadow-sm bg-c-done" />
              
              {/* Card */}
              <div className="bg-surface border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-1 leading-tight truncate">
                      {card.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] font-mono text-text-3">
                        {new Date(card.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                        <span className="text-text-4 ml-1">
                          {new Date(card.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  {card.owner && (
                    <Avatar className="h-7 w-7 border border-border shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {card.owner.full_name?.charAt(0) || card.owner.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}