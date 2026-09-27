import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProjectProvider } from './context/ProjectContext'
import { ToastProvider } from './components/Toast'

// Layouts & Pages
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import PersonalBoard from '@/pages/PersonalBoard'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ProjectPage from '@/pages/ProjectPage'
import GlobalHistory from '@/pages/GlobalHistory'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'

// 1. Define the router using the Data Router API
const router = createBrowserRouter([
  {
    element: <AppLayout />, // This renders the Sidebar + TopHeader + <Outlet />
    children: [
      { index: true, element: <Dashboard /> }, // Handles the root "/" URL
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/personal', element: <PersonalBoard /> },
      { path: '/history', element: <GlobalHistory /> },
      { path: '/notifications', element: <Notifications /> },
      { path: '/settings', element: <Settings /> },
      { path: '/projects/:projectId/*', element: <ProjectPage /> },
    ]
  },
  // Auth routes stay outside the layout
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
])

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <ToastProvider>
          {/* 2. Render RouterProvider directly. 
                 Do NOT wrap it in BrowserRouter or Routes! */}
          <RouterProvider router={router} />
        </ToastProvider>
      </ProjectProvider>
    </AuthProvider>
  )
}