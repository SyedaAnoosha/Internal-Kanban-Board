import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [location.pathname])

  function handleNewTask() {
    window.dispatchEvent(new CustomEvent('erm:new-task'));
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* ── Desktop Sidebar (Always visible on lg+) ── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar-bg lg:sticky lg:top-0 lg:h-screen">
        <Sidebar />
      </aside>

      {/* ── Mobile Sidebar (Sheet overlay) ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent 
          side="left" 
          className="w-72 p-0 bg-sidebar-bg border-sidebar-border overflow-y-auto"
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader onMenuClick={() => setMobileOpen(true)} onNewTask={handleNewTask} />
        
        <main className="flex-1 overflow-auto">
          {/* If using React Router v6 nested routes, use <Outlet />. 
              Otherwise, pass children if you wrap routes manually. */}
          <Outlet /> 
        </main>
      </div>
    </div>
  )
}