import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, BellOff, CheckCheck, UserPlus, CheckCircle2, Undo2, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Map backend notification types to icons and color themes
const NOTIF_CONFIG = {
  task_assigned: { icon: ClipboardList, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  review_requested: { icon: CheckCircle2, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  review_approved: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  changes_requested: { icon: Undo2, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  project_invite: { icon: UserPlus, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
}

// ── Smart Time Grouping Logic ──
function getTimeGroup(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  
  // Normalize to start of day for accurate comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = startOfToday - startOfDate
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return "This Week"
  
  if (diffDays < 14) return "1 Week Ago"
  if (diffDays < 21) return "2 Weeks Ago"
  if (diffDays < 28) return "3 Weeks Ago"
  
  if (diffDays < 365) {
    // Calculate exact calendar months
    let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
    if (now.getDate() < date.getDate()) months--
    if (months < 1) months = 1
    if (months === 1) return "1 Month Ago"
    return `${months} Months Ago`
  }
  
  // Calculate exact calendar years
  let years = now.getFullYear() - date.getFullYear()
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) {
    years--
  }
  if (years < 1) years = 1
  if (years === 1) return "1 Year Ago"
  return `${years} Years Ago`
}

// Helper for exact time ago (e.g., "5m ago", "2h ago")
function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'
  const navigate = useNavigate()

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setNotifications(await res.json())
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()
  }, [fetchNotifications])

  async function markRead(id) {
    const token = localStorage.getItem('access_token')
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const token = localStorage.getItem('access_token')
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  function handleClick(notif) {
    if (!notif.is_read) markRead(notif.id)
    if (notif.project_id) {
      navigate(`/projects/${notif.project_id}/board`)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // 1. Filter notifications based on selected tab
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.is_read)
    if (filter === 'read') return notifications.filter(n => n.is_read)
    return notifications
  }, [notifications, filter])

  // 2. Group filtered notifications by time period
  const groupedNotifications = useMemo(() => {
    const groups = {}
    filteredNotifications.forEach(notif => {
      const group = getTimeGroup(notif.created_at)
      if (!groups[group]) groups[group] = []
      groups[group].push(notif)
    })
    return groups
  }, [filteredNotifications])

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Notifications</h1>
          <p className="text-sm text-text-3 mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'You are all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs (All / Unread / Read) */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'read', label: 'Read' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
              filter === tab.id 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "bg-bg-subtle text-text-3 hover:text-text-1 hover:bg-bg-subtle/80"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                filter === tab.id ? "bg-white/20" : "bg-border text-text-2"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-dashed bg-bg-subtle/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-14 w-14 rounded-full bg-bg-subtle flex items-center justify-center mb-4">
              <BellOff className="h-6 w-6 text-text-3" />
            </div>
            <h3 className="text-lg font-semibold text-text-1 mb-1">
              {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-text-3 text-center max-w-xs">
              {filter === 'all' && 'Notifications will appear here when you receive task assignments, review requests, and project invitations.'}
              {filter === 'unread' && 'You have read all your notifications. Great job!'}
              {filter === 'read' && 'You haven\'t read any notifications yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Render each time group */}
          {Object.entries(groupedNotifications).map(([group, notifs]) => (
            <div key={group}>
              {/* Group Header with Divider Line */}
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-bold text-text-3 uppercase tracking-wider whitespace-nowrap">
                  {group}
                </h3>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Notifications List for this Group */}
              <div className="space-y-2">
                {notifs.map(notif => {
                  const config = NOTIF_CONFIG[notif.type] || { icon: Bell, color: 'text-text-3 bg-bg-subtle border-border' }
                  const Icon = config.icon || Bell
                  
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 text-left rounded-lg border transition-all duration-200 group",
                        notif.is_read 
                          ? "bg-surface border-border hover:border-border-strong" 
                          : "bg-primary-muted/30 border-primary/20 hover:border-primary/40"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center border shrink-0", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-snug line-clamp-2",
                          notif.is_read ? "text-text-2 font-medium" : "text-text-1 font-semibold"
                        )}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-text-3 mt-0.5 line-clamp-1">{notif.message}</p>
                        )}
                        <p className="text-[11px] text-text-4 mt-1 font-mono">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>

                      {/* Unread Indicator Dot */}
                      {!notif.is_read && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}