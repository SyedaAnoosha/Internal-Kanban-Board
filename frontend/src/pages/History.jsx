import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function HistorySkeleton() {
  return (
    <div className="history-list-premium">
      {[1, 2, 3].map(i => (
        <div key={i} className="history-card" style={{ opacity: 0.6 }}>
          <div className="skeleton" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%' }}></div>
          <div className="history-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton" style={{ height: '1.25rem', width: '60%' }}></div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="skeleton" style={{ height: '1rem', width: '30%' }}></div>
              <div className="skeleton" style={{ height: '1rem', width: '25%' }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function History() {
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('all') // FIX: Default to 'all'
  const [cards, setCards] = useState([])
  const [loadingMonths, setLoadingMonths] = useState(true)
  const [loadingCards, setLoadingCards] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function fetchMonths() {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/history/months`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok && isMounted) {
          const data = await res.json()
          setMonths(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoadingMonths(false)
      }
    }
    fetchMonths()
    return () => { isMounted = false }
  }, [])

  // FIX: Fetch cards even if 'all' is selected
  useEffect(() => {
    let isMounted = true
    async function fetchCards() {
      setLoadingCards(true)
      try {
        const token = localStorage.getItem('access_token')
        
        // FIX: Only append month if a specific month is selected
        let url = `${API_BASE}/history/`
        if (selectedMonth && selectedMonth !== 'all') {
          url += `?month=${selectedMonth}`
        }

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok && isMounted) {
          setCards(await res.json())
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoadingCards(false)
      }
    }
    fetchCards()
    return () => { isMounted = false }
  }, [selectedMonth])

  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return new Date(year, month - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isLoading = loadingMonths || loadingCards

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="mobile-header">
          <button onClick={() => setSidebarOpen(true)} className="mobile-menu-btn" aria-label="Open menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="mobile-header-title">History</h1>
          <div style={{ width: '2.5rem' }}></div>
        </header>

        <div className="history-page">
          <section className="history-hero">
            <div className="history-hero-content">
              <div className="history-hero-text">
                <h1>Completion History</h1>
                <p>Track your team's milestones and finished tasks.</p>
              </div>
              <div className="history-stats">
                <div className="stat-pill">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>{cards.length} Tasks</span>
                </div>
              </div>
            </div>
            
            <div className="history-controls">
              <div className="filter-group">
                <label>Filter by Month</label>
                <select
                  className="history-select-premium"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={loadingMonths} // FIX: Removed months.length === 0 check so 'All' is always clickable
                >
                  <option value="all">All Months</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <main className="history-content">
            {isLoading ? (
              <HistorySkeleton />
            ) : cards.length === 0 ? (
              <div className="history-empty-premium">
                <div className="history-empty-icon-premium">
                  <span className="material-symbols-outlined">history_toggle_off</span>
                </div>
                <h3 className="history-empty-title-premium">No history found</h3>
                <p className="history-empty-text-premium">
                  Complete tasks in the Kanban board to see them tracked here.
                </p>
              </div>
            ) : (
              <div className="history-list-premium">
                {cards.map((card, index) => {
                  const ownerInitial = card.owner 
                    ? (card.owner.full_name?.charAt(0) || card.owner.email.charAt(0).toUpperCase())
                    : '?'
                  
                  return (
                    <div key={card.id} className="history-card" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="history-card-icon">
                        <span className="material-symbols-outlined">verified</span>
                      </div>
                      <div className="history-card-body">
                        <h4 className="history-card-title" title={card.title}>{card.title}</h4>
                        <div className="history-card-meta">
                          <span className="meta-item">
                            <div className="owner-avatar-sm">{ownerInitial}</div>
                            {card.owner ? (card.owner.full_name || card.owner.email.split('@')[0]) : 'Unassigned'}
                          </span>
                          <span className="meta-item">
                            <span className="material-symbols-outlined">calendar_today</span>
                            {formatDate(card.completed_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}