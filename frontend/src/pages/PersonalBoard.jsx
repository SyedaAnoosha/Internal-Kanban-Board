import { useState, useEffect } from 'react' 
import { CardProvider } from '../context/CardContext'
import Board from '../components/Board'
import { useProject } from '../context/ProjectContext'

export default function PersonalBoard() {
  const [setSidebarOpen] = useState(false)
  const { setActiveProjectId } = useProject()

  useEffect(() => {
    setActiveProjectId(null)
  }, [setActiveProjectId])

  return (
      
      <div className="main-content">
        <CardProvider>
          <Board projectId={null} onMenuClick={() => setSidebarOpen(true)} />
        </CardProvider>
      </div>
  )
}