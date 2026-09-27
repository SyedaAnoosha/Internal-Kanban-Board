import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Menu, Search, Plus, LogOut, Settings } from 'lucide-react'

export default function TopHeader({ onMenuClick, onNewTask }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Derive page title from route
  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard'
    if (location.pathname === '/personal') return 'Personal Board'
    if (location.pathname === '/history') return 'Monthly History'
    // if (location.pathname === '/notifications') return 'Notifications'
    if (location.pathname.startsWith('/projects/')) return 'Project Board'
    return 'ERM'
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60 px-4 sm:px-6">
      {/* Mobile Menu Trigger */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden" 
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Page Title */}
      <h1 className="text-base font-semibold text-text-1 tracking-tight hidden sm:block">
        {getPageTitle()}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Right Side Actions ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Global Search Trigger (Spotlight Style) */}
        <button className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md bg-bg-subtle border border-border text-text-3 text-sm hover:bg-surface-2 transition-colors w-64">
          <Search className="h-4 w-4" />
          <span>Search tasks...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-surface px-1.5 font-mono text-[10px] font-medium text-text-3">
            ⌘K
          </kbd>
        </button>

        {/* 2. Attach the onClick handler here */}
        <Button size="sm" className="h-8 gap-1.5" onClick={onNewTask}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-text-1">{user?.email?.split('@')[0]}</p>
                <p className="text-xs leading-none text-text-3">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}