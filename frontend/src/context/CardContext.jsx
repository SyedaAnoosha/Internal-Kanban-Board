import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useProject } from './ProjectContext'

const CardContext = createContext(null)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function CardProvider({ children }) {
  const { user } = useAuth()
  const { activeProjectId } = useProject()

  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const lastProjectIdRef = useRef(activeProjectId)

  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (lastProjectIdRef.current !== activeProjectId) {
      setCards([])
      lastProjectIdRef.current = activeProjectId
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('No authentication token found')
      const headers = { Authorization: `Bearer ${token}` }

      let cardsUrl = `${API_BASE}/cards/`
      const params = new URLSearchParams()

      if (activeProjectId) {
        params.append('project_id', activeProjectId)
      } else {
        params.append('personal', 'true')
      }

      cardsUrl += `?${params.toString()}`

      const [colsRes, cardsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/columns/`, { headers }),
        fetch(cardsUrl, { headers }),
        fetch(`${API_BASE}/users/`, { headers }),
      ])

      if (!colsRes.ok || !cardsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [colsData, cardsData, usersData] = await Promise.all([
        colsRes.json(),
        cardsRes.json(),
        usersRes.json(),
      ])

      setColumns(colsData || [])
      setCards(cardsData || [])
      setUsers(usersData || [])
    } catch (err) {
      console.error('Failed to fetch initial data:', err)
      setError(err.message || 'Cannot connect to the server')
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchInitialData()
    } else {
      setColumns([])
      setCards([])
      setUsers([])
      setLoading(false)
    }
  }, [user, fetchInitialData])

  async function createCard(cardData) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(cardData),
    })
    if (!res.ok) { 
      const error = await res.json()
      throw new Error(error.detail || 'Failed to create card') 
    }
    const newCard = await res.json()
    setCards((prev) => [...prev, newCard])
    return newCard
  }

  async function updateCard(cardId, updates) {
    const token = localStorage.getItem('access_token')
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, ...updates } : c))

    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    if (!res.ok) { 
      const error = await res.json()
      fetchInitialData()
      throw new Error(error.detail || 'Failed to update card') 
    }
    const updatedCard = await res.json()
    setCards((prev) => prev.map((c) => (c.id === cardId ? updatedCard : c)))
    return updatedCard
  }

  // NEW: Dedicated move function for perfect drag-and-drop smoothness
  async function moveCard(cardId, targetColumnId, newIndex) {
    // 1. Instantly reorder the local array to match the visual drop position
    setCards(prev => {
      const activeCard = prev.find(c => c.id === cardId)
      if (!activeCard) return prev

      // Get cards in target column (excluding the active card if it's already there)
      let targetCards = prev.filter(c => c.column_id === targetColumnId && c.id !== cardId)
      const otherCards = prev.filter(c => c.column_id !== targetColumnId && c.id !== cardId)
      
      // Insert active card at the exact new index
      targetCards.splice(newIndex, 0, activeCard)
      
      // Assign new sequential positions to prevent database sorting collisions
      const updatedTargetCards = targetCards.map((c, idx) => ({ 
        ...c, 
        column_id: targetColumnId, 
        position: idx 
      }))
      
      return [...otherCards, ...updatedTargetCards]
    })

    // 2. Sync with backend
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ column_id: targetColumnId, position: newIndex }),
    })
    if (!res.ok) {
      const error = await res.json()
      fetchInitialData() // Revert on failure
      throw new Error(error.detail || 'Failed to move card')
    }
  }

  async function deleteCard(cardId) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { 
      const error = await res.json()
      throw new Error(error.detail || 'Failed to delete card') 
    }
    setCards((prev) => prev.filter((c) => c.id !== cardId))
  }

  function getCardsByColumn(columnId) {
    return cards
      .filter((c) => c.column_id === columnId)
      .sort((a, b) => a.position - b.position)
  }

  function getUserById(userId) {
    return users.find((u) => u.id === userId)
  }

  async function submitForReview(cardId) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/${cardId}/submit-review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) { const error = await res.json(); throw new Error(error.detail || 'Failed to submit') }
    
    const reviewCol = columns.find(c => c.name === 'Under Review')
    if (reviewCol) setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: reviewCol.id } : c))
  }

  async function approveCard(cardId) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/${cardId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) { const error = await res.json(); throw new Error(error.detail || 'Failed to approve') }
    
    const doneCol = columns.find(c => c.name === 'Done')
    if (doneCol) setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: doneCol.id, completed_at: new Date().toISOString() } : c))
  }

  async function requestChanges(cardId) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/${cardId}/request-changes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) { const error = await res.json(); throw new Error(error.detail || 'Failed to request changes') }
    
    const inProgressCol = columns.find(c => c.name === 'In Progress')
    if (inProgressCol) setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: inProgressCol.id } : c))
  }

  async function getCardEvents(cardId) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/cards/${cardId}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Failed to fetch events')
    }
    return await res.json()
  }

  return (
    <CardContext.Provider
      value={{
        columns, cards, users, loading, error,
        createCard, updateCard, deleteCard, getCardsByColumn, getUserById,
        submitForReview, approveCard, requestChanges, getCardEvents, refetch: fetchInitialData,
        moveCard, // Expose the new move function
      }}
    >
      {children}
    </CardContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCards() {
  const context = useContext(CardContext)
  if (!context) throw new Error('useCards must be used within CardProvider')
  return context
}