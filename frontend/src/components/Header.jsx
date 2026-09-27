import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold text-slate-900">
            ERM Kanban
          </h1>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}