import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('access_token')))

  // Refresh the access token using the refresh token
  const refreshSession = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        return true
      } else {
        // Refresh token is invalid, force logout
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        return false
      }
    } catch (err) {
      console.error('Token refresh failed:', err)
      return false
    }
  }, [])

  // Validate current token, refresh if needed
  const validateAndRefreshToken = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return false

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        return true
      } else if (res.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshSession()
        if (refreshed) {
          // Retry the /me call with new token
          const newToken = localStorage.getItem('access_token')
          const retryRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` }
          })
          if (retryRes.ok) {
            const userData = await retryRes.json()
            setUser(userData)
            return true
          }
        }
        return false
      }
      return false
    } catch (err) {
      console.error('Token validation failed:', err)
      return false
    }
  }, [refreshSession])

  // Set up automatic token refresh every 50 minutes (tokens expire at 60 min)
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    // Initial validation
    ;(async () => {
      const isValid = await validateAndRefreshToken()
      if (!isValid) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      }
      setLoading(false)
    })()

    // Set up periodic refresh every 50 minutes
    const refreshInterval = setInterval(async () => {
      const hasToken = localStorage.getItem('access_token')
      if (hasToken) {
        await refreshSession()
      }
    }, 50 * 60 * 1000) // 50 minutes

    return () => clearInterval(refreshInterval)
  }, [validateAndRefreshToken, refreshSession])

  async function signup(email, password, fullName) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.detail || 'Signup failed')
    }

    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)

    return data
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.detail || 'Login failed')
    }

    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)

    return data
  }

  async function logout() {
    const token = localStorage.getItem('access_token')

    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error('Logout request failed:', err)
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}