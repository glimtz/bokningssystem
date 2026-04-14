import React, { useState, useEffect, useCallback, useMemo, Component } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import * as api from './adminApi'
import './admin.css'

// ============================================================
// ERROR BOUNDARY
// ============================================================

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('Admin Error Boundary:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#C0392B' }}>Något gick fel</h2>
          <p style={{ color: '#6B6B6B', margin: '0.5rem 0' }}>{this.state.error?.message || 'Okänt fel'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#E38A05', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Ladda om
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// AUTH CONTEXT
// ============================================================

const AuthContext = React.createContext(null)

const useAuth = () => {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSession().then(s => {
      setSession(s)
      setLoading(false)
    })
    const { data: { subscription } } = api.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await api.signOut()
    setSession(null)
  }

  if (loading) {
    return <div className="admin-loading">Laddar...</div>
  }

  return (
    <AuthContext.Provider value={{ session, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================
// LOGIN PAGE
// ============================================================

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.signIn(email, password)
    } catch (err) {
      setError(err.message || 'Inloggningen misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-wrapper">
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <div className="admin-login-header">
          <h1>Vilhelmina River Lodge</h1>
          <p>Admin Dashboard</p>
        </div>
        {error && <div className="admin-error">{error}</div>}
        <div className="admin-field">
          <label htmlFor="email">E-post</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            autoFocus
          />
        </div>
        <div className="admin-field">
          <label htmlFor="password">Lösenord</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" className="admin-btn admin-btn-primary admin-btn-full" disabled={loading}>
          {loading ? 'Loggar in...' : 'Logga in'}
        </button>
      </form>
    </div>
  )
}

// ============================================================
// SIDEBAR LAYOUT
// ============================================================

const AdminLayout = () => {
  const { session, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!session) return <LoginPage />

  return (
    <div className="admin-layout">
      <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Vilhelmina River Lodge</h2>
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">📊</span> Översikt
          </NavLink>
          <NavLink to="/admin/bookings" onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">📋</span> Bokningar
          </NavLink>
          <NavLink to="/admin/calendar" onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">📅</span> Kalender
          </NavLink>
          <NavLink to="/admin/seasons" onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">⚙️</span> Säsonger & priser
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">{session.user?.email}</div>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={logout}>
            Logga ut
          </button>
        </div>
      </aside>
      <main className="admin-main" onClick={() => sidebarOpen && setSidebarOpen(false)}>
        <Routes>
          <Route index element={<StatsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="seasons" element={<SeasonsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

// ============================================================
// STATS PAGE (Översikt)
// ============================================================

const StatsPage = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getStats()
      .then(s => { setStats(s); setLoading(false) })
      .catch(err => {
        console.error('Stats error:', err)
        setError(err.message || 'Kunde inte ladda statistik')
        setLoading(false)
      })
  }, [])

  const statusLabels = {
    pending: 'Väntande',
    confirmed: 'Bekräftade',
    paid: 'Betalda',
    completed: 'Genomförda',
    cancelled: 'Avbokade',
    declined: 'Nekade',
  }

  const statusColors = {
    pending: '#E38A05',
    confirmed: '#3C6680',
    paid: '#568C03',
    completed: '#4A592A',
    cancelled: '#C0392B',
    declined: '#8A501E',
  }

  // Monthly bookings chart data — must be before any early returns (React hooks rule)
  const monthlyData = useMemo(() => {
    if (!stats) return Array.from({ length: 12 }, (_, i) => ({ month: i, count: 0, revenue: 0 }))
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i, count: 0, revenue: 0 }))
    const currentYear = new Date().getFullYear()
    ;(stats.bookings || []).forEach(b => {
      const d = new Date(b.created_at)
      if (d.getFullYear() === currentYear) {
        months[d.getMonth()].count++
        if (['confirmed', 'paid', 'completed'].includes(b.status)) {
          months[d.getMonth()].revenue += b.total_price || 0
        }
      }
    })
    return months
  }, [stats])

  const maxCount = Math.max(...monthlyData.map(m => m.count), 1)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

  if (loading) return <div className="admin-loading">Laddar statistik...</div>
  if (error) return <div className="admin-error">Fel: {error}</div>
  if (!stats) return <div className="admin-error">Kunde inte ladda statistik.</div>

  return (
    <div>
      <h1 className="admin-page-title">Översikt</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.thisYearBookings}</div>
          <div className="stat-label">Bokningar {new Date().getFullYear()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.byStatus.pending || 0}</div>
          <div className="stat-label">Väntande</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-value">{new Intl.NumberFormat('sv-SE').format(stats.totalRevenue)} kr</div>
          <div className="stat-label">Totala intäkter</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalNights}</div>
          <div className="stat-label">Bokade nätter</div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Bokningar per månad ({new Date().getFullYear()})</h2>
        <div className="chart-bar-container">
          {monthlyData.map((m, i) => (
            <div key={i} className="chart-bar-col">
              <div className="chart-bar-value">{m.count > 0 ? m.count : ''}</div>
              <div className="chart-bar" style={{ height: `${(m.count / maxCount) * 120}px` }} />
              <div className="chart-bar-label">{monthNames[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Status fördelning</h2>
        <div className="status-breakdown">
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = stats.byStatus[key] || 0
            const pct = stats.totalBookings > 0 ? Math.round((count / stats.totalBookings) * 100) : 0
            return (
              <div key={key} className="status-row">
                <div className="status-row-label">
                  <span className="status-dot" style={{ background: statusColors[key] }} />
                  {label}
                </div>
                <div className="status-row-bar-container">
                  <div className="status-row-bar" style={{ width: `${pct}%`, background: statusColors[key] }} />
                </div>
                <div className="status-row-count">{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// BOOKINGS PAGE
// ============================================================

const statusOptions = [
  { value: 'all', label: 'Alla' },
  { value: 'pending', label: 'Väntande' },
  { value: 'confirmed', label: 'Bekräftade' },
  { value: 'paid', label: 'Betalda' },
  { value: 'completed', label: 'Genomförda' },
  { value: 'cancelled', label: 'Avbokade' },
  { value: 'declined', label: 'Nekade' },
]

const statusBadgeClass = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  paid: 'badge-paid',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  declined: 'badge-declined',
}

// Helper: check if a pending booking overlaps with any confirmed/paid/completed booking
// check_out day is treated as occupied (cleaning time) — two bookings cannot share any day.
const hasDateConflict = (booking, allBookings) => {
  if (booking.status !== 'pending') return false
  const start = new Date(booking.check_in + 'T00:00:00')
  const end = new Date(booking.check_out + 'T00:00:00')
  const confirmedStatuses = ['confirmed', 'paid', 'completed']

  return allBookings.some(other => {
    if (other.id === booking.id) return false
    if (!confirmedStatuses.includes(other.status)) return false
    const otherStart = new Date(other.check_in + 'T00:00:00')
    const otherEnd = new Date(other.check_out + 'T00:00:00')
    // Overlap (inclusive): booking ranges may not touch at all
    return start <= otherEnd && end >= otherStart
  })
}

const BookingsPage = () => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const [filtered, all] = await Promise.all([
        api.getBookings({ status: filter, search }),
        api.getBookings({ status: 'all', limit: 500 }),
      ])
      setBookings(filtered.data)
      setAllBookings(all.data)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { loadBookings() }, [loadBookings])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateBookingStatus(id, newStatus)
      loadBookings()
    } catch (err) {
      alert('Kunde inte uppdatera status: ' + err.message)
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—'
  const formatPrice = (p) => new Intl.NumberFormat('sv-SE').format(p) + ' kr'

  return (
    <div>
      <h1 className="admin-page-title">Bokningar</h1>

      <div className="admin-toolbar">
        <div className="admin-search">
          <input
            type="text"
            placeholder="Sök referens, namn eller e-post..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-tabs">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              className={`filter-tab ${filter === opt.value ? 'active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Laddar bokningar...</div>
      ) : bookings.length === 0 ? (
        <div className="admin-empty">Inga bokningar matchar filtret.</div>
      ) : (
        <div className="bookings-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Referens</th>
                <th>Gäst</th>
                <th>Incheckning</th>
                <th>Utcheckning</th>
                <th>Gäster</th>
                <th>Totalt</th>
                <th>Status</th>
                <th>Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const conflict = hasDateConflict(b, allBookings)
                return (
                  <tr key={b.id} className={`booking-row ${conflict ? 'booking-row-conflict' : ''}`} onClick={() => navigate(`/admin/bookings/${b.id}`)}>
                    <td className="ref-cell">{b.reference}</td>
                    <td>
                      <div className="guest-name">{b.guests?.name}</div>
                      <div className="guest-email">{b.guests?.email}</div>
                    </td>
                    <td>{formatDate(b.check_in)}</td>
                    <td>{formatDate(b.check_out)}</td>
                    <td>{b.num_guests}</td>
                    <td className="price-cell">{formatPrice(b.total_price)}</td>
                    <td>
                      <span className={`admin-badge-status ${statusBadgeClass[b.status]}`}>
                        {statusOptions.find(o => o.value === b.status)?.label || b.status}
                      </span>
                      {conflict && <span className="conflict-badge">⚠ Datumkrock</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {b.status === 'pending' && !conflict && (
                        <div className="action-btns">
                          <button className="admin-btn admin-btn-confirm admin-btn-xs" onClick={() => handleStatusChange(b.id, 'confirmed')}>
                            Godkänn
                          </button>
                          <button className="admin-btn admin-btn-decline admin-btn-xs" onClick={() => handleStatusChange(b.id, 'declined')}>
                            Neka
                          </button>
                        </div>
                      )}
                      {b.status === 'pending' && conflict && (
                        <div className="action-btns">
                          <button className="admin-btn admin-btn-decline admin-btn-xs" onClick={() => handleStatusChange(b.id, 'declined')}>
                            Neka
                          </button>
                        </div>
                      )}
                      {b.status === 'confirmed' && (
                        <button className="admin-btn admin-btn-confirm admin-btn-xs" onClick={() => handleStatusChange(b.id, 'paid')}>
                          Betald
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// BOOKING DETAIL PAGE
// ============================================================

const BookingDetailPage = () => {
  const navigate = useNavigate()
  const id = window.location.pathname.split('/').pop()
  const [booking, setBooking] = useState(null)
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadBooking = useCallback(async () => {
    try {
      const [data, all] = await Promise.all([
        api.getBookingById(id),
        api.getBookings({ status: 'all', limit: 500 }),
      ])
      setBooking(data)
      setAllBookings(all.data)
      setNotes(data.admin_notes || '')
    } catch (err) {
      console.error('Failed to load booking:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadBooking() }, [loadBooking])

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateBookingStatus(id, newStatus)
      loadBooking()
    } catch (err) {
      alert('Kunde inte uppdatera status: ' + err.message)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    try {
      await api.updateBookingNotes(id, notes)
    } catch (err) {
      alert('Kunde inte spara anteckningar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-loading">Laddar bokning...</div>
  if (!booking) return <div className="admin-error">Bokningen kunde inte hittas.</div>

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—'
  const formatPrice = (p) => new Intl.NumberFormat('sv-SE').format(p) + ' kr'
  const nightCount = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24))

  return (
    <div>
      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/admin/bookings')} style={{ marginBottom: '1rem' }}>
        ← Tillbaka
      </button>

      <div className="detail-header">
        <h1 className="admin-page-title">{booking.reference}</h1>
        <span className={`admin-badge-status ${statusBadgeClass[booking.status]}`}>
          {statusOptions.find(o => o.value === booking.status)?.label || booking.status}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Gästuppgifter</h3>
          <div className="detail-row"><span>Namn</span><strong>{booking.guests?.name}</strong></div>
          <div className="detail-row"><span>E-post</span><strong>{booking.guests?.email}</strong></div>
          <div className="detail-row"><span>Telefon</span><strong>{booking.guests?.phone || '—'}</strong></div>
          <div className="detail-row"><span>Språk</span><strong>{booking.guests?.language?.toUpperCase()}</strong></div>
          {booking.guests?.marketing_consent && <div className="detail-row"><span>Marknadsföring</span><strong>Ja</strong></div>}
        </div>

        <div className="detail-card">
          <h3>Bokningsdetaljer</h3>
          <div className="detail-row"><span>Incheckning</span><strong>{formatDate(booking.check_in)}</strong></div>
          <div className="detail-row"><span>Utcheckning</span><strong>{formatDate(booking.check_out)}</strong></div>
          <div className="detail-row"><span>Nätter</span><strong>{nightCount}</strong></div>
          <div className="detail-row"><span>Gäster</span><strong>{booking.num_guests}</strong></div>
          <div className="detail-row"><span>Skapad</span><strong>{formatDate(booking.created_at)}</strong></div>
        </div>

        <div className="detail-card">
          <h3>Priser</h3>
          <div className="detail-row"><span>Lodge</span><strong>{formatPrice(booking.lodge_total)}</strong></div>
          <div className="detail-row"><span>Tillval</span><strong>{formatPrice(booking.addons_total)}</strong></div>
          <div className="detail-row total"><span>Totalt</span><strong>{formatPrice(booking.total_price)}</strong></div>
          <div className="detail-row"><span>Deposition</span><strong>{formatPrice(booking.deposit_amount)}</strong></div>
        </div>

        {booking.booking_addons?.length > 0 && (
          <div className="detail-card">
            <h3>Tillval</h3>
            {booking.booking_addons.map(ba => {
              const addonName = ba.addons?.translations?.sv?.name || ba.addons?.translations?.en?.name || ba.addons?.slug
              const hasSelectedDates = ba.selected_dates && ba.selected_dates.length > 0
              return (
                <div key={ba.id}>
                  <div className="detail-row">
                    <span>{addonName} × {ba.quantity}</span>
                    <strong>{formatPrice(ba.total_price)}</strong>
                  </div>
                  {hasSelectedDates && (
                    <div className="detail-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                        Valda dagar: {ba.selected_dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {booking.message && (
        <div className="detail-card" style={{ marginTop: '1rem' }}>
          <h3>Gästens meddelande</h3>
          <p className="guest-message">{booking.message}</p>
        </div>
      )}

      <div className="detail-card" style={{ marginTop: '1rem' }}>
        <h3>Admin-anteckningar</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Interna anteckningar..."
          className="admin-textarea"
        />
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={saveNotes} disabled={saving} style={{ marginTop: '0.5rem' }}>
          {saving ? 'Sparar...' : 'Spara anteckningar'}
        </button>
      </div>

      <div className="detail-actions">
        <h3>Ändra status</h3>
        {booking.status === 'pending' && hasDateConflict(booking, allBookings) && (
          <div className="conflict-warning">
            <strong>⚠ Datumkrock:</strong> Det finns redan en bekräftad bokning som överlappar med dessa datum. Bokningen kan inte godkännas.
          </div>
        )}
        <div className="action-btns">
          {booking.status === 'pending' && !hasDateConflict(booking, allBookings) && (
            <>
              <button className="admin-btn admin-btn-confirm" onClick={() => handleStatusChange('confirmed')}>Godkänn bokning</button>
              <button className="admin-btn admin-btn-decline" onClick={() => handleStatusChange('declined')}>Neka bokning</button>
            </>
          )}
          {booking.status === 'pending' && hasDateConflict(booking, allBookings) && (
            <button className="admin-btn admin-btn-decline" onClick={() => handleStatusChange('declined')}>Neka bokning</button>
          )}
          {booking.status === 'confirmed' && (
            <>
              <button className="admin-btn admin-btn-confirm" onClick={() => handleStatusChange('paid')}>Markera som betald</button>
              <button className="admin-btn admin-btn-decline" onClick={() => handleStatusChange('cancelled')}>Avboka</button>
            </>
          )}
          {booking.status === 'paid' && (
            <>
              <button className="admin-btn admin-btn-confirm" onClick={() => handleStatusChange('completed')}>Markera som genomförd</button>
              <button className="admin-btn admin-btn-decline" onClick={() => handleStatusChange('cancelled')}>Avboka</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CALENDAR PAGE
// ============================================================

const CalendarPage = () => {
  const [bookings, setBookings] = useState([])
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [newBlocked, setNewBlocked] = useState({ fromDate: '', toDate: '', reason: '' })

  const loadCalendarData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.getBookings({ limit: 200 }),
      api.getBlockedDates(),
    ]).then(([bRes, bDates]) => {
      setBookings(bRes.data.filter(b => ['pending', 'confirmed', 'paid', 'completed'].includes(b.status)))
      setBlocked(bDates)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadCalendarData() }, [loadCalendarData])

  const handleAddBlocked = async () => {
    if (!newBlocked.fromDate) return
    const from = newBlocked.fromDate
    const to = newBlocked.toDate || from
    const reason = newBlocked.reason || 'Blockerad'

    // Generate all dates in range
    const dates = []
    const current = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    try {
      const results = []
      for (const date of dates) {
        // Skip if already blocked
        if (blocked.find(b => b.date === date)) continue
        const added = await api.addBlockedDate(date, reason)
        results.push(added)
      }
      setBlocked(prev => [...prev, ...results])
      setNewBlocked({ fromDate: '', toDate: '', reason: '' })
      setNewBlocked({ date: '', reason: '' })
    } catch (err) {
      alert('Kunde inte blockera datum: ' + err.message)
    }
  }

  const handleRemoveBlocked = async (id) => {
    try {
      await api.removeBlockedDate(id)
      setBlocked(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      alert('Kunde inte ta bort blockerat datum: ' + err.message)
    }
  }

  if (loading) return <div className="admin-loading">Laddar kalender...</div>

  const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
  const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

  // Show May-September (the lodge season)
  const seasonMonths = [4, 5, 6, 7, 8]

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

  // Normalize date strings to YYYY-MM-DD (Supabase may return with timezone)
  const toDateStr = (d) => d ? d.substring(0, 10) : ''

  // Status priority: higher = wins when multiple bookings overlap
  const statusPriority = { completed: 4, paid: 3, confirmed: 2, pending: 1 }

  const getDateStatus = (dateStr) => {
    if (blocked.find(b => toDateStr(b.date) === dateStr)) return 'blocked'
    let bestStatus = null
    let bestPriority = -1
    for (const b of bookings) {
      if (dateStr >= toDateStr(b.check_in) && dateStr < toDateStr(b.check_out)) {
        const prio = statusPriority[b.status] || 0
        if (prio > bestPriority) {
          bestStatus = b.status
          bestPriority = prio
        }
      }
    }
    return bestStatus || 'available'
  }

  const getBookingForDate = (dateStr) => {
    // Return the highest-priority booking for this date
    let best = null
    let bestPriority = -1
    for (const b of bookings) {
      if (dateStr >= toDateStr(b.check_in) && dateStr < toDateStr(b.check_out)) {
        const prio = statusPriority[b.status] || 0
        if (prio > bestPriority) {
          best = b
          bestPriority = prio
        }
      }
    }
    return best
  }

  const calendarStatusClass = {
    available: '',
    blocked: 'cal-blocked',
    pending: 'cal-pending',
    confirmed: 'cal-confirmed',
    paid: 'cal-paid',
    completed: 'cal-completed',
  }

  return (
    <div>
      <h1 className="admin-page-title">Kalender {viewYear}</h1>

      <div className="calendar-year-nav">
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setViewYear(y => y - 1)}>← {viewYear - 1}</button>
        <span className="year-label">{viewYear}</span>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setViewYear(y => y + 1)}>{viewYear + 1} →</button>
      </div>

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot cal-available" /> Ledigt</span>
        <span className="legend-item"><span className="legend-dot cal-pending" /> Förfrågan</span>
        <span className="legend-item"><span className="legend-dot cal-confirmed" /> Bekräftad</span>
        <span className="legend-item"><span className="legend-dot cal-paid" /> Betald</span>
        <span className="legend-item"><span className="legend-dot cal-blocked" /> Blockerad</span>
      </div>

      <div className="calendar-months-grid">
        {seasonMonths.map(month => {
          const daysInMonth = getDaysInMonth(viewYear, month)
          const firstDay = getFirstDayOfMonth(viewYear, month)

          return (
            <div key={month} className="cal-month-card">
              <h3 className="cal-month-title">{monthNames[month]}</h3>
              <div className="cal-grid">
                {weekdays.map(d => <div key={d} className="cal-weekday">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="cal-day empty" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${viewYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const status = getDateStatus(dateStr)
                  const booking = getBookingForDate(dateStr)

                  return (
                    <div
                      key={day}
                      className={`cal-day ${calendarStatusClass[status] || ''}`}
                      title={booking ? `${booking.reference} — ${booking.guests?.name}` : status === 'blocked' ? 'Blockerad' : 'Ledigt'}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="admin-section" style={{ marginTop: '2rem' }}>
        <h2 className="admin-section-title">Blockerade datum</h2>

        <div className="blocked-form">
          <div className="blocked-form-dates">
            <label>Från</label>
            <input
              type="date"
              value={newBlocked.fromDate}
              onChange={e => setNewBlocked(prev => ({ ...prev, fromDate: e.target.value, toDate: prev.toDate || e.target.value }))}
            />
            <label>Till</label>
            <input
              type="date"
              value={newBlocked.toDate}
              min={newBlocked.fromDate}
              onChange={e => setNewBlocked(prev => ({ ...prev, toDate: e.target.value }))}
            />
          </div>
          <input
            type="text"
            placeholder="Anledning (t.ex. Underhåll)"
            value={newBlocked.reason}
            onChange={e => setNewBlocked(prev => ({ ...prev, reason: e.target.value }))}
          />
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleAddBlocked}>
            Blockera {newBlocked.fromDate && newBlocked.toDate && newBlocked.fromDate !== newBlocked.toDate
              ? `${Math.round((new Date(newBlocked.toDate) - new Date(newBlocked.fromDate)) / 86400000) + 1} dagar`
              : 'datum'}
          </button>
        </div>

        {blocked.length > 0 && (
          <div className="blocked-list">
            {blocked.map(b => (
              <div key={b.id} className="blocked-item">
                <span className="blocked-date">{b.date}</span>
                <span className="blocked-reason">{b.reason || '—'}</span>
                <span className="blocked-source">{b.source}</span>
                <button className="admin-btn admin-btn-decline admin-btn-xs" onClick={() => handleRemoveBlocked(b.id)}>
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// SEASONS PAGE
// ============================================================

const SeasonsPage = () => {
  const [seasons, setSeasons] = useState([])
  const [addons, setAddons] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [editingAddon, setEditingAddon] = useState(null)
  const [editingSettings, setEditingSettings] = useState(null)
  const [newSeason, setNewSeason] = useState({ year: new Date().getFullYear(), name: '', start_date: '', end_date: '', is_active: true })
  const [newPeriod, setNewPeriod] = useState({ season_id: '', name: '', start_date: '', end_date: '', price_per_night: '', min_nights: 1 })
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [showNewPeriod, setShowNewPeriod] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [seasonsData, addonsData, settingsData] = await Promise.all([
        api.getSeasons(),
        api.getAddons(),
        api.getSettings(),
      ])
      setSeasons(seasonsData)
      setAddons(addonsData)
      setSettings(settingsData)
    } catch (err) {
      console.error('Failed to load pricing data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ---- Addon handlers ----
  const handleSaveAddon = async () => {
    if (!editingAddon) return
    try {
      await api.updateAddon(editingAddon.id, {
        price: parseInt(editingAddon.price),
        is_active: editingAddon.is_active,
      })
      setEditingAddon(null)
      loadData()
    } catch (err) {
      alert('Kunde inte spara tillval: ' + err.message)
    }
  }

  // ---- Settings handlers ----
  const handleSaveSettings = async () => {
    if (!editingSettings) return
    try {
      for (const [key, value] of Object.entries(editingSettings)) {
        await api.updateSetting(key, typeof value === 'string' ? JSON.stringify(value) : value)
      }
      setEditingSettings(null)
      loadData()
    } catch (err) {
      alert('Kunde inte spara inställningar: ' + err.message)
    }
  }

  const handleCreateSeason = async () => {
    if (!newSeason.name || !newSeason.start_date || !newSeason.end_date) return
    try {
      await api.createSeason(newSeason)
      setShowNewSeason(false)
      setNewSeason({ year: new Date().getFullYear(), name: '', start_date: '', end_date: '', is_active: true })
      loadData()
    } catch (err) {
      alert('Kunde inte skapa säsong: ' + err.message)
    }
  }

  const handleToggleActive = async (season) => {
    try {
      await api.updateSeason(season.id, { is_active: !season.is_active })
      loadData()
    } catch (err) {
      alert('Kunde inte uppdatera säsong: ' + err.message)
    }
  }

  const handleCreatePeriod = async (seasonId) => {
    if (!newPeriod.name || !newPeriod.start_date || !newPeriod.end_date || !newPeriod.price_per_night) return
    try {
      await api.createPricingPeriod({ ...newPeriod, season_id: seasonId, price_per_night: parseInt(newPeriod.price_per_night) })
      setShowNewPeriod(null)
      setNewPeriod({ season_id: '', name: '', start_date: '', end_date: '', price_per_night: '', min_nights: 1 })
      loadData()
    } catch (err) {
      alert('Kunde inte skapa prisperiod: ' + err.message)
    }
  }

  const handleUpdatePeriod = async () => {
    if (!editingPeriod) return
    try {
      await api.updatePricingPeriod(editingPeriod.id, {
        name: editingPeriod.name,
        start_date: editingPeriod.start_date,
        end_date: editingPeriod.end_date,
        price_per_night: parseInt(editingPeriod.price_per_night),
        min_nights: parseInt(editingPeriod.min_nights),
      })
      setEditingPeriod(null)
      loadData()
    } catch (err) {
      alert('Kunde inte uppdatera prisperiod: ' + err.message)
    }
  }

  const handleDeletePeriod = async (id) => {
    if (!confirm('Är du säker?')) return
    try {
      await api.deletePricingPeriod(id)
      loadData()
    } catch (err) {
      alert('Kunde inte ta bort prisperiod: ' + err.message)
    }
  }

  if (loading) return <div className="admin-loading">Laddar säsonger...</div>

  return (
    <div>
      <div className="detail-header">
        <h1 className="admin-page-title">Säsonger & priser</h1>
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setShowNewSeason(true)}>
          + Ny säsong
        </button>
      </div>

      {showNewSeason && (
        <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
          <h3>Skapa ny säsong</h3>
          <div className="season-form">
            <input type="number" placeholder="År" value={newSeason.year} onChange={e => setNewSeason(s => ({ ...s, year: parseInt(e.target.value) }))} />
            <input type="text" placeholder="Namn (t.ex. Sommar 2027)" value={newSeason.name} onChange={e => setNewSeason(s => ({ ...s, name: e.target.value }))} />
            <input type="date" value={newSeason.start_date} onChange={e => setNewSeason(s => ({ ...s, start_date: e.target.value }))} />
            <input type="date" value={newSeason.end_date} onChange={e => setNewSeason(s => ({ ...s, end_date: e.target.value }))} />
            <div className="season-form-actions">
              <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleCreateSeason}>Skapa</button>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowNewSeason(false)}>Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {seasons.map(season => (
        <div key={season.id} className="season-card">
          <div className="season-header">
            <div>
              <h2 className="season-name">{season.name}</h2>
              <span className="season-dates">{season.start_date} → {season.end_date}</span>
            </div>
            <div className="season-header-actions">
              <span className={`admin-badge-status ${season.is_active ? 'badge-paid' : 'badge-cancelled'}`}>
                {season.is_active ? 'Aktiv' : 'Inaktiv'}
              </span>
              <button
                className="admin-btn admin-btn-secondary admin-btn-xs"
                onClick={() => handleToggleActive(season)}
              >
                {season.is_active ? 'Inaktivera' : 'Aktivera'}
              </button>
            </div>
          </div>

          <div className="pricing-periods">
            <h4>Prisperioder</h4>
            {season.pricing_periods?.length > 0 ? (
              <table className="admin-table compact">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Från</th>
                    <th>Till</th>
                    <th>Pris/natt</th>
                    <th>Min nätter</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {season.pricing_periods.map(pp => (
                    editingPeriod?.id === pp.id ? (
                      <tr key={pp.id}>
                        <td><input type="text" value={editingPeriod.name} onChange={e => setEditingPeriod(p => ({ ...p, name: e.target.value }))} /></td>
                        <td><input type="date" value={editingPeriod.start_date} onChange={e => setEditingPeriod(p => ({ ...p, start_date: e.target.value }))} /></td>
                        <td><input type="date" value={editingPeriod.end_date} onChange={e => setEditingPeriod(p => ({ ...p, end_date: e.target.value }))} /></td>
                        <td><input type="number" value={editingPeriod.price_per_night} onChange={e => setEditingPeriod(p => ({ ...p, price_per_night: e.target.value }))} /></td>
                        <td><input type="number" value={editingPeriod.min_nights} onChange={e => setEditingPeriod(p => ({ ...p, min_nights: e.target.value }))} /></td>
                        <td>
                          <div className="action-btns">
                            <button className="admin-btn admin-btn-confirm admin-btn-xs" onClick={handleUpdatePeriod}>Spara</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => setEditingPeriod(null)}>Avbryt</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={pp.id}>
                        <td>{pp.name}</td>
                        <td>{pp.start_date}</td>
                        <td>{pp.end_date}</td>
                        <td>{new Intl.NumberFormat('sv-SE').format(pp.price_per_night)} kr</td>
                        <td>{pp.min_nights}</td>
                        <td>
                          <div className="action-btns">
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => setEditingPeriod({ ...pp })}>Redigera</button>
                            <button className="admin-btn admin-btn-decline admin-btn-xs" onClick={() => handleDeletePeriod(pp.id)}>Ta bort</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="admin-empty-sm">Inga prisperioder ännu.</p>
            )}

            {showNewPeriod === season.id ? (
              <div className="new-period-form">
                <input type="text" placeholder="Namn (t.ex. Högsäsong)" value={newPeriod.name} onChange={e => setNewPeriod(p => ({ ...p, name: e.target.value }))} />
                <input type="date" value={newPeriod.start_date} onChange={e => setNewPeriod(p => ({ ...p, start_date: e.target.value }))} />
                <input type="date" value={newPeriod.end_date} onChange={e => setNewPeriod(p => ({ ...p, end_date: e.target.value }))} />
                <input type="number" placeholder="Pris per natt (SEK)" value={newPeriod.price_per_night} onChange={e => setNewPeriod(p => ({ ...p, price_per_night: e.target.value }))} />
                <input type="number" placeholder="Min nätter" value={newPeriod.min_nights} onChange={e => setNewPeriod(p => ({ ...p, min_nights: e.target.value }))} />
                <div className="season-form-actions">
                  <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => handleCreatePeriod(season.id)}>Lägg till</button>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowNewPeriod(null)}>Avbryt</button>
                </div>
              </div>
            ) : (
              <button className="admin-btn admin-btn-secondary admin-btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setShowNewPeriod(season.id)}>
                + Ny prisperiod
              </button>
            )}
          </div>
        </div>
      ))}

      {seasons.length === 0 && (
        <div className="admin-empty">Inga säsonger skapade ännu. Skapa din första säsong ovan.</div>
      )}

      {/* ---- LODGE BASE PRICING ---- */}
      <div style={{ marginTop: '2.5rem' }}>
        <div className="detail-header">
          <h1 className="admin-page-title">Lodge-pris</h1>
          {!editingSettings ? (
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingSettings({
              price_per_person_per_night: settings.price_per_person_per_night || 950,
              min_price_per_night: settings.min_price_per_night || 4000,
              deposit_amount: settings.deposit_amount || 5000,
              max_guests: settings.max_guests || 8,
            })}>
              Redigera
            </button>
          ) : (
            <div className="action-btns">
              <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={handleSaveSettings}>Spara</button>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingSettings(null)}>Avbryt</button>
            </div>
          )}
        </div>

        <div className="detail-card">
          {editingSettings ? (
            <div className="season-form" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <div className="detail-row">
                <span>Pris per person per natt (SEK)</span>
                <input type="number" value={editingSettings.price_per_person_per_night} onChange={e => setEditingSettings(s => ({ ...s, price_per_person_per_night: parseInt(e.target.value) || 0 }))} style={{ width: '120px', textAlign: 'right' }} />
              </div>
              <div className="detail-row">
                <span>Minimumpris per natt (SEK)</span>
                <input type="number" value={editingSettings.min_price_per_night} onChange={e => setEditingSettings(s => ({ ...s, min_price_per_night: parseInt(e.target.value) || 0 }))} style={{ width: '120px', textAlign: 'right' }} />
              </div>
              <div className="detail-row">
                <span>Deposition (SEK)</span>
                <input type="number" value={editingSettings.deposit_amount} onChange={e => setEditingSettings(s => ({ ...s, deposit_amount: parseInt(e.target.value) || 0 }))} style={{ width: '120px', textAlign: 'right' }} />
              </div>
              <div className="detail-row">
                <span>Max antal gäster</span>
                <input type="number" value={editingSettings.max_guests} onChange={e => setEditingSettings(s => ({ ...s, max_guests: parseInt(e.target.value) || 1 }))} style={{ width: '120px', textAlign: 'right' }} />
              </div>
            </div>
          ) : (
            <>
              <div className="detail-row"><span>Pris per person per natt</span><strong>{new Intl.NumberFormat('sv-SE').format(settings.price_per_person_per_night || 950)} kr</strong></div>
              <div className="detail-row"><span>Minimumpris per natt</span><strong>{new Intl.NumberFormat('sv-SE').format(settings.min_price_per_night || 4000)} kr</strong></div>
              <div className="detail-row"><span>Deposition</span><strong>{new Intl.NumberFormat('sv-SE').format(settings.deposit_amount || 5000)} kr</strong></div>
              <div className="detail-row"><span>Max antal gäster</span><strong>{settings.max_guests || 8}</strong></div>
            </>
          )}
        </div>
      </div>

      {/* ---- ADDONS PRICING ---- */}
      <div style={{ marginTop: '2.5rem' }}>
        <h1 className="admin-page-title">Tillval</h1>

        <div className="bookings-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tillval</th>
                <th>Pris (SEK)</th>
                <th>Pristyp</th>
                <th>Aktiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {addons.map(addon => {
                const name = addon.translations?.sv?.name || addon.translations?.en?.name || addon.slug
                const priceTypeLabel = { per_day: 'Per dag', per_person: 'Per person', flat: 'Fast pris' }
                const isEditing = editingAddon?.id === addon.id

                return isEditing ? (
                  <tr key={addon.id}>
                    <td><strong>{name}</strong></td>
                    <td>
                      <input type="number" value={editingAddon.price} onChange={e => setEditingAddon(a => ({ ...a, price: e.target.value }))} style={{ width: '100px' }} />
                    </td>
                    <td>{priceTypeLabel[addon.price_type] || addon.price_type}</td>
                    <td>
                      <input type="checkbox" checked={editingAddon.is_active} onChange={e => setEditingAddon(a => ({ ...a, is_active: e.target.checked }))} />
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="admin-btn admin-btn-confirm admin-btn-xs" onClick={handleSaveAddon}>Spara</button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => setEditingAddon(null)}>Avbryt</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={addon.id}>
                    <td><strong>{name}</strong></td>
                    <td>{new Intl.NumberFormat('sv-SE').format(addon.price)} kr</td>
                    <td>{priceTypeLabel[addon.price_type] || addon.price_type}</td>
                    <td>{addon.is_active ? '✓' : '—'}</td>
                    <td>
                      <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => setEditingAddon({ ...addon })}>
                        Redigera
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN ADMIN APP
// ============================================================

const AdminApp = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminLayout />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default AdminApp
