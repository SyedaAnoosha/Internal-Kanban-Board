import { useState, useEffect, useMemo } from 'react'
import { useProject } from '@/context/ProjectContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CalendarIcon, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// ── Skeleton Loader ──
function HistorySkeleton() {
  return (
    <div className="relative border-l-2 border-border ml-2 md:ml-4 space-y-10">
      {[1, 2].map(month => (
        <div key={month} className="relative">
          <div className="sticky top-14 z-10 -ml-[2.15rem] mb-6">
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(card => (
              <div key={card} className="relative pl-8">
                <Skeleton className="absolute -left-[7px] top-2 h-4 w-4 rounded-full border-4 border-bg-base" />
                <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GlobalHistory() {
  const { projects } = useProject()
  
  const [allCards, setAllCards] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [dateRange, setDateRange] = useState({ from: null, to: null })

  // Fetch all history on mount (we filter client-side for instant UI updates)
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/history/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) setAllCards(await res.json())
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Extract unique years and available months based on current year selection
  const { years, availableMonths } = useMemo(() => {
    const yearsSet = new Set()
    const monthsSet = new Set()
    
    allCards.forEach(card => {
      if (card.completed_at) {
        const date = new Date(card.completed_at)
        yearsSet.add(date.getFullYear().toString())
        monthsSet.add(date.getMonth())
      }
    })
    
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a)
    
    let filteredMonths = Array.from(monthsSet).sort((a, b) => a - b)
    if (selectedYear !== 'all') {
      filteredMonths = filteredMonths.filter(m => {
        return allCards.some(c => {
          const d = new Date(c.completed_at)
          return d.getFullYear().toString() === selectedYear && d.getMonth() === m
        })
      })
    }

    return { years: sortedYears, availableMonths: filteredMonths }
  }, [allCards, selectedYear])

  // Filter cards based on all active filters
  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      if (!card.completed_at) return false
      const date = new Date(card.completed_at)
      
      if (selectedYear !== 'all' && date.getFullYear().toString() !== selectedYear) return false
      if (selectedMonth !== 'all' && date.getMonth() !== parseInt(selectedMonth)) return false
      
      if (dateRange?.from) {
        if (date < dateRange.from) return false
      }
      if (dateRange?.to) {
        const toEnd = new Date(dateRange.to)
        toEnd.setHours(23, 59, 59, 999)
        if (date > toEnd) return false
      }
      
      return true
    }).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
  }, [allCards, selectedYear, selectedMonth, dateRange])

  // Calculate summary statistics
  const stats = useMemo(() => {
    const total = filteredCards.length
    const contributors = new Set(filteredCards.map(c => c.owner_id).filter(Boolean)).size
    
    const now = new Date()
    const weekAgo = new Date(now.setDate(now.getDate() - 7))
    const recentCount = filteredCards.filter(c => new Date(c.completed_at) >= weekAgo).length

    return { total, contributors, recentCount }
  }, [filteredCards])

  function resetFilters() {
    setSelectedYear('all')
    setSelectedMonth('all')
    setDateRange({ from: null, to: null })
  }

  // Group cards by month for the timeline layout
  const groupedCards = useMemo(() => {
    const groups = {}
    filteredCards.forEach(card => {
      const date = new Date(card.completed_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(card)
    })
    return groups
  }, [filteredCards])

  function getProjectColor(projectId) {
    if (!projectId) return 'var(--primary)'
    const index = projects.findIndex(p => p.id === projectId)
    const colors = ['var(--primary)', 'var(--c-progress)', 'var(--c-done)', 'var(--c-review)']
    return colors[Math.max(0, index) % colors.length]
  }

  const hasActiveFilters = selectedYear !== 'all' || selectedMonth !== 'all' || dateRange?.from

  // Render Skeleton while loading
  if (loading) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <HistorySkeleton />
      </main>
    )
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* ── Header & Filters ── */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Completion History</h1>
          <p className="text-sm text-text-3 mt-1">Track your team's milestones and finished tasks.</p>
        </div>
        
        {/* Responsive Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Year Dropdown */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-[110px] bg-surface">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Month Dropdown */}
          <Select 
            value={selectedMonth} 
            onValueChange={setSelectedMonth}
            disabled={selectedYear === 'all' && availableMonths.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[130px] bg-surface">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map(m => <SelectItem key={m} value={m.toString()}>{MONTH_NAMES[m]}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Custom Range Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal bg-surface">
                <CalendarIcon className="mr-2 h-4 w-4 text-text-3 shrink-0" />
                <span className="truncate">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Custom Range"
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 text-text-3 shrink-0" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Metrics (Matches Dashboard Stats Layout) ── */}
      <div className="bg-surface border border-border rounded-lg divide-x divide-border overflow-hidden mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3">
          <MetricItem label="Total Completed" value={stats.total} />
          <MetricItem label="Velocity (7D)" value={stats.recentCount} />
          <MetricItem label="Contributors" value={stats.contributors} />
        </div>
      </div>

      {/* ── The Timeline ── */}
      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg bg-bg-subtle/30">
          <CalendarIcon className="h-8 w-8 text-text-3 mb-3" />
          <p className="text-sm font-medium text-text-1">No completed tasks found</p>
          <p className="text-xs text-text-3 mt-1 px-4">Try adjusting your filters or complete some tasks.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-border ml-2 md:ml-4 space-y-10">
          {Object.entries(groupedCards).map(([monthKey, cards]) => {
            const [year, month] = monthKey.split('-')
            const monthName = MONTH_NAMES[parseInt(month) - 1]
            
            return (
              <div key={monthKey} className="relative">
                {/* Sticky Month Header */}
                <div className="sticky top-14 z-10 -ml-[2.15rem] mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-full shadow-sm">
                    <CalendarIcon className="h-3 w-3 text-text-3" />
                    <span className="text-xs font-semibold text-text-2 tracking-wide">
                      {monthName} {year}
                    </span>
                  </div>
                </div>

                {/* Timeline Items */}
                <div className="space-y-4">
                  {cards.map(card => {
                    const project = projects.find(p => p.id === card.project_id)
                    const color = getProjectColor(card.project_id)
                    const date = new Date(card.completed_at)
                    
                    return (
                      <div key={card.id} className="relative pl-8">
                        {/* Timeline Dot */}
                        <div 
                          className="absolute -left-[7px] top-2 h-4 w-4 rounded-full border-4 border-bg-base shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        
                        {/* Content Card (Mobile Optimized) */}
                        <div className="bg-surface border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 w-full">
                              <h3 className="text-sm font-semibold text-text-1 leading-tight break-words">
                                {card.title}
                              </h3>
                              
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                {project && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-[11px] font-medium text-text-3 truncate">{project.name}</span>
                                  </div>
                                )}
                                {/* Monospaced Timestamp */}
                                <span className="text-[11px] font-mono text-text-3 whitespace-nowrap">
                                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                                  <span className="text-text-4 ml-1">
                                    {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </span>
                              </div>
                            </div>
                            
                            {/* Assignee Avatar */}
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
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

// ── Sub-component for Metrics (Now matches Dashboard's StatItem exactly) ──
function MetricItem({ label, value }) {
  return (
    <div className="p-6">
      <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider mb-3">
        {label}
      </p>
      <p className="text-3xl font-semibold font-mono tracking-tight text-text-1 leading-none">
        {value}
      </p>
    </div>
  )
}