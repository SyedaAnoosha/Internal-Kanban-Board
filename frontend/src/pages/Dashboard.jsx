import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Folder, ArrowUpRight, ClipboardList, CheckCheck, ArrowRight } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ── Skeleton Loader ──
function DashboardSkeleton() {
  return (
    <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="bg-surface border border-border rounded-lg divide-x divide-border overflow-hidden mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-6 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Skeleton for Action Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map(i => (
          <div key={i} className="border border-border rounded-lg p-5 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2">
              {/* Show exactly 3 skeleton items to match the new limit */}
              {[1, 2, 3].map(j => <Skeleton key={j} className="h-14 w-full" />)}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default function Dashboard() {
  const { projects } = useProject()
  const { user } = useAuth()
  
  const [stats, setStats] = useState({
    assignedToMe: 0,
    needsReview: 0,
    completedToday: 0,
    totalProjects: 0
  })
  const [projectData, setProjectData] = useState({})
  const [myActiveTasks, setMyActiveTasks] = useState([])
  const [awaitingReview, setAwaitingReview] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || projects.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStats(prev => ({ ...prev, totalProjects: projects.length }))
      setLoading(false)
      return
    }

    let cancelled = false
    async function fetchStats() {
      try {
        const token = localStorage.getItem('access_token')
        const headers = { Authorization: `Bearer ${token}` }
        
        const promises = [
          fetch(`${API_BASE}/cards/?personal=true`, { headers }),
          fetch(`${API_BASE}/columns/`, { headers }),
          ...projects.map(p => fetch(`${API_BASE}/cards/?project_id=${p.id}`, { headers })),
          ...projects.map(p => fetch(`${API_BASE}/projects/${p.id}/members`, { headers }))
        ]

        const responses = await Promise.all(promises)
        const data = await Promise.all(responses.map(r => r.ok ? r.json() : Promise.resolve([])))

        if (cancelled) return

        const personalCards = data[0]
        const columns = data[1]
        const projectCardArrays = data.slice(2, 2 + projects.length)
        const projectMemberArrays = data.slice(2 + projects.length)

        const allProjectCards = projectCardArrays.flat()
        const allCards = [...personalCards, ...allProjectCards]
        const today = new Date().toDateString()

        const seenIds = new Set()
        const myCards = allCards.filter(c => {
          if (c.owner_id === user.id && !seenIds.has(c.id)) {
            seenIds.add(c.id)
            return true
          }
          return false
        })

        const reviewCol = columns.find(c => c.name === 'Under Review')
        const reviewColumnId = reviewCol?.id || null
        const doneColId = columns.find(c => c.name === 'Done')?.id

        const needsReview = allProjectCards.filter(c =>
          c.assigned_by === user.id && c.column_id === reviewColumnId
        ).length

        const uniqueDone = new Set()
        const completedToday = allCards.filter(c => {
          if (c.completed_at && new Date(c.completed_at).toDateString() === today && !uniqueDone.has(c.id)) {
            uniqueDone.add(c.id)
            return true
          }
          return false
        }).length

        setStats({
          assignedToMe: myCards.length,
          needsReview,
          completedToday,
          totalProjects: projects.length,
        })

        const statsMap = {}
        projects.forEach((p, index) => {
          const cards = projectCardArrays[index] || []
          const members = projectMemberArrays[index] || []
          const totalCards = cards.length
          const completedCards = cards.filter(c => c.completed_at).length
          const progress = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0
          statsMap[p.id] = { progress, members: members.map(m => m.user).filter(Boolean) }
        })
        setProjectData(statsMap)

        // Fetch ALL active tasks (removed the .slice so the badge count is accurate)
        const activeTasks = myCards
          .filter(c => c.column_id !== doneColId)
          .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))

        // Fetch ALL review tasks
        const reviewTasks = allProjectCards
          .filter(c => c.assigned_by === user.id && c.column_id === reviewColumnId)
          .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))

        setMyActiveTasks(activeTasks)
        setAwaitingReview(reviewTasks)

      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [user?.id, projects])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">
          Welcome back, {user?.email?.split('@')[0] || 'User'}
        </h1>
        <p className="text-sm text-text-3 mt-1">
          Here's what's happening with your tasks today.
        </p>
      </div>

      {/* ── Editorial Stats Grid ── */}
      <div className="bg-surface border border-border rounded-lg divide-x divide-border overflow-hidden mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <StatItem label="Assigned to Me" value={stats.assignedToMe} />
          <StatItem label="Awaiting Review" value={stats.needsReview} />
          <StatItem label="Completed Today" value={stats.completedToday} />
          <StatItem label="Active Projects" value={stats.totalProjects} />
        </div>
      </div>

      {/* ── Actionable Lists ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ActionList 
          title="My Active Tasks" 
          icon={ClipboardList} 
          items={myActiveTasks} 
          projects={projects} 
          emptyMessage="You're all caught up! No active tasks assigned to you."
        />
        <ActionList 
          title="Awaiting Your Review" 
          icon={CheckCheck} 
          items={awaitingReview} 
          projects={projects} 
          emptyMessage="No tasks are waiting for your review."
        />
      </div>

      {/* ── Projects Overview ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-text-1">Your Projects</h2>
          <Link 
            to="/personal" 
            className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
          >
            View Personal Board <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed bg-bg-subtle/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Folder className="h-8 w-8 text-text-3 mb-3" />
              <p className="text-sm font-medium text-text-1 mb-1">No projects yet</p>
              <p className="text-xs text-text-3">Create your first project from the sidebar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                data={projectData[project.id] || { progress: 0, members: [] }} 
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

// ── Sub-components ──

function StatItem({ label, value }) {
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

function ActionList({ title, icon: Icon, items, projects, emptyMessage }) {
  // 1. Limit rendering to exactly 3 items
  const displayItems = items.slice(0, 3)
  const hasMore = items.length > 3

  return (
    <Card className="h-full">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-text-1">{title}</h3>
          </div>
          {/* Total count badge */}
          <span className="text-[11px] font-mono font-medium text-text-3 bg-bg-subtle px-2 py-0.5 rounded-md border border-border">
            {items.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg bg-bg-subtle/20">
              <p className="text-xs text-text-3 max-w-[20ch]">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2">
                {displayItems.map(task => {
                  const project = projects.find(p => p.id === task.project_id)
                  return (
                    <Link 
                      key={task.id} 
                      // Route to the project board, or fallback to personal board
                      to={task.project_id ? `/projects/${task.project_id}/board` : '/personal'} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-bg-subtle/50 transition-all group"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-text-1 truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        {project && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Folder className="h-3 w-3 text-text-4 shrink-0" />
                            <span className="text-[11px] text-text-3 truncate">{project.name}</span>
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  )
                })}
              </div>

              {/* 2. Show All Button (Routes to Personal Board) */}
              {hasMore && (
                <Link
                  to="/personal"
                  className="mt-4 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary hover:text-primary-hover hover:bg-primary/5 rounded-md transition-colors"
                >
                  Show all tasks
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectCard({ project, data }) {
  const { progress, members } = data

  return (
    <Link to={`/projects/${project.id}/board`} className="block h-full">
      <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group h-full">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <Folder className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-1 leading-tight line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-xs text-text-3 mt-0.5 line-clamp-1">
                  {project.description || 'No description'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-text-3">Progress</span>
                <span className="text-[11px] font-mono font-medium text-text-2">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((m) => (
                  <Avatar key={m.id} className="h-6 w-6 border-2 border-surface">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                      {m.full_name?.charAt(0) || m.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 3 && (
                  <div className="h-6 w-6 rounded-full border-2 border-surface bg-bg-subtle flex items-center justify-center text-[9px] font-bold text-text-3">
                    +{members.length - 3}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-text-3 font-mono">
                {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}