import { useParams, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useProject } from '@/context/ProjectContext'
import { CardProvider } from '@/context/CardContext'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Folder } from 'lucide-react'

import Board from '@/components/Board'
import ProjectHistory from './ProjectHistory'
import ProjectMembers from './ProjectMembers'
import ProjectSettings from './ProjectSettings'

export default function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, setActiveProjectId } = useProject()

  // Sync the active project so CardContext fetches only this project's tasks
  useEffect(() => {
    setActiveProjectId(projectId)
    return () => setActiveProjectId(null)
  }, [projectId, setActiveProjectId])

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId])

  // Derive active tab from URL
  const currentTab = useMemo(() => {
    const pathAfterBase = location.pathname.replace(`/projects/${projectId}`, '')
    const segment = pathAfterBase.split('/').filter(Boolean)[0]
    return segment || 'board'
  }, [location.pathname, projectId])

  if (!project) {
    return <div className="p-8 text-center text-text-3">Project not found.</div>
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Project Header & Tabs */}
      <div className="border-b border-border bg-surface px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Folder className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-text-1 truncate">{project.name}</h1>
            {project.description && <p className="text-sm text-text-3 mt-0.5 truncate">{project.description}</p>}
          </div>
        </div>

        {/* shadcn Tabs integrated with React Router */}
        <Tabs value={currentTab} onValueChange={(val) => navigate(`/projects/${projectId}/${val}`)}>
          <TabsList className="bg-transparent h-10 p-0 justify-start w-full border-b border-border rounded-none">
            <TabsTrigger 
              value="board" 
              className="data-[state=active]:bg-bg-subtle data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none pb-2.5 px-4"
            >
              Board
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-bg-subtle data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none pb-2.5 px-4"
            >
              History
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="data-[state=active]:bg-bg-subtle data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none pb-2.5 px-4"
            >
              Members
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-bg-subtle data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none pb-2.5 px-4"
            >
              Settings
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sub-page Content */}
      <main className="flex-1 overflow-auto bg-bg-base">
        <Routes>
          <Route path="board" element={<CardProvider><Board projectId={projectId} /></CardProvider>} />
          <Route path="history" element={<ProjectHistory projectId={projectId} />} />
          <Route path="members" element={<ProjectMembers projectId={projectId} />} />
          <Route path="settings" element={<ProjectSettings projectId={projectId} project={project} />} />
          <Route path="" element={<Navigate to="board" replace />} />
        </Routes>
      </main>
    </div>
  )
}