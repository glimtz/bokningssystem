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

  // Bokningar per vistelsemånad (check_in), uppdelat per status
  const monthlyByStay = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i, confirmed: 0, paid: 0, completed: 0 }))
    if (!stats) return months
    const currentYear = new Date().getFullYear()
    ;(stats.bookings || []).forEach(b => {
      if (!['confirmed', 'paid', 'completed'].includes(b.status)) return
      const d = new Date(b.check_in)
      if (d.getFullYear() === currentYear) {
        months[d.getMonth()][b.status]++
      }
    })
    return months
  }, [stats])

  const maxStayCount = Math.max(...monthlyByStay.map(m => m.confirmed + m.paid + m.completed), 1)

  if (loading) return <div className="admin-loading">Laddar statistik...</div>
  if (error) return <div className="admin-error">Fel: {error}</div>
  if (!stats) return <div className="admin-error">Kunde inte ladda statistik.</div>

  return (
    <div>
      <h1 className="admin-page-title">Översikt</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.thisYearBookings}</div>
          <div className="stat-label">Bokningsförfrågningar {new Date().getFullYear()}</div>
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
        <h2 className="admin-section-title">Inkomna bokningsförfrågningar per månad ({new Date().getFullYear()})</h2>
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

      <div className="admin-section">
        <h2 className="admin-section-title">Bokningar per månad ({new Date().getFullYear()})</h2>
        <div className="chart-bar-container">
          {monthlyByStay.map((m, i) => {
            const total = m.confirmed + m.paid + m.completed
            const heightPx = (total / maxStayCount) * 120
            return (
              <div key={i} className="chart-bar-col">
                <div className="chart-bar-value">{total > 0 ? total : ''}</div>
                <div
                  style={{
                    width: '100%',
                    height: `${heightPx}px`,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  {m.confirmed > 0 && (
                    <div style={{ flexGrow: m.confirmed, background: statusColors.confirmed }} />
                  )}
                  {m.paid > 0 && (
                    <div style={{ flexGrow: m.paid, background: statusColors.paid }} />
                  )}
                  {m.completed > 0 && (
                    <div style={{ flexGrow: m.completed, background: statusColors.completed }} />
                  )}
                </div>
                <div className="chart-bar-label">{monthNames[i]}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: statusColors.confirmed }} />
            Bekräftade
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: statusColors.paid }} />
            Betalda
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: statusColors.completed }} />
            Genomförda
          </span>
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

// Boendealternativ — måste matcha bookings.rental_option i databasen.
const rentalOptionChoices = [
  { value: 'full_lodge', label: 'Hela lodgen' },
  { value: 'lillstuga', label: 'Endast Lillstugan' },
]
const rentalOptionLabel = (v) =>
  (rentalOptionChoices.find(o => o.value === (v || 'full_lodge')) || rentalOptionChoices[0]).label

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

// ============================================================
// NEW BOOKING MODAL — Skapa bokning direkt i admin
// ============================================================

const NewBookingModal = ({ onClose, onCreated }) => {
  const [settings, setSettings] = useState({})
  const [allAddons, setAllAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', id_number: '', language: 'sv',
    check_in: '', check_out: '', num_guests: 2, status: 'confirmed', message: '',
    rental_option: 'full_lodge',
  })
  // addonSel: { [addonId]: { selected, days, dates: [] } }
  const [addonSel, setAddonSel] = useState({})
  // Rabatt på totalpriset (kr)
  const [discountAmount, setDiscountAmount] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([api.getSettings(), api.getAddons()])
        setSettings(s || {})
        setAllAddons(a || [])
      } catch (err) {
        console.error('Failed to load modal data:', err)
      } finally { setLoading(false) }
    })()
  }, [])

  const nights = api.nightsBetween(form.check_in, form.check_out)
  const numGuests = parseInt(form.num_guests, 10) || 1
  const perNight = api.lodgePricePerNight(numGuests, settings, form.rental_option)
  const lodgeTotal = nights > 0 ? perNight * nights : 0
  const deposit = parseInt(settings.deposit_amount) || 5000
  const formatPrice = (p) => new Intl.NumberFormat('sv-SE').format(p) + ' kr'
  // Städning kostar mindre om man bara hyr Lillstugan.
  const cleaningPrice = parseInt(settings.lillstuga_cleaning_price) || 700
  const effPrice = (a) => (form.rental_option === 'lillstuga' && (a.slug === 'cleaning' || a.id === 'cleaning')) ? cleaningPrice : a.price

  const stayDates = () => {
    if (!form.check_in || !form.check_out || nights <= 0) return []
    const out = []
    const d = new Date(form.check_in + 'T00:00:00')
    const end = new Date(form.check_out + 'T00:00:00')
    while (d < end) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      d.setDate(d.getDate() + 1)
    }
    return out
  }

  const addonQty = (a) => {
    const sel = addonSel[a.id]
    if (a.price_type === 'per_day') return sel?.days || nights || 1
    if (a.price_type === 'per_person') return numGuests
    return 1
  }
  const addonLineTotal = (a) => addonSel[a.id]?.selected ? api.addonRowTotal({ ...a, price: effPrice(a) }, { quantity: addonQty(a), numGuests }) : 0
  const addonsTotal = allAddons.reduce((s, a) => s + addonLineTotal(a), 0)
  // Rabatt på totalpriset: total = (lodge + tillval) − rabatt
  const baseTotal = lodgeTotal + addonsTotal
  const discountNum = Math.min(Math.max(0, parseInt(discountAmount, 10) || 0), baseTotal)
  const discountPct = discountNum > 0 && baseTotal > 0 ? Math.round((discountNum / baseTotal) * 100) : 0
  const total = baseTotal - discountNum

  const toggleAddon = (id) => setAddonSel(prev => ({
    ...prev,
    [id]: { ...(prev[id] || {}), selected: !prev[id]?.selected, days: prev[id]?.days ?? (nights || 1), dates: prev[id]?.dates || [] },
  }))
  const setAddonDays = (id, days) => setAddonSel(prev => {
    const cur = prev[id] || {}
    const d = Math.max(1, parseInt(days, 10) || 1)
    let dates = cur.dates || []
    if (dates.length > d) dates = dates.slice(0, d)
    return { ...prev, [id]: { ...cur, days: d, dates } }
  })
  const toggleAddonDate = (id, dStr, maxDays) => setAddonSel(prev => {
    const cur = prev[id] || {}
    const dates = cur.dates || []
    let next
    if (dates.includes(dStr)) next = dates.filter(x => x !== dStr)
    else { if (dates.length >= maxDays) return prev; next = [...dates, dStr].sort() }
    return { ...prev, [id]: { ...cur, dates: next } }
  })

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) { alert('Namn och e-post krävs.'); return }
    if (!form.check_in || !form.check_out) { alert('Ange in- och utcheckningsdatum.'); return }
    if (new Date(form.check_out) <= new Date(form.check_in)) { alert('Utcheckning måste vara efter incheckning.'); return }
    setSaving(true)
    try {
      const addons = allAddons.filter(a => addonSel[a.id]?.selected).map(a => {
        const quantity = addonQty(a)
        const sel = addonSel[a.id]
        return {
          addon_id: a.id,
          quantity,
          unit_price: effPrice(a),
          total_price: api.addonRowTotal({ ...a, price: effPrice(a) }, { quantity, numGuests }),
          selected_dates: (a.price_type === 'per_day' && sel.dates?.length) ? sel.dates : null,
        }
      })
      const discountNote = discountNum > 0
        ? `Rabatt: ${formatPrice(discountNum)} (${discountPct} %) på totalpris (ordinarie ${formatPrice(baseTotal)})`
        : null
      const res = await api.createBooking({
        guest: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), id_number: form.id_number.trim() || null, language: form.language, marketing_consent: false },
        booking: { check_in: form.check_in, check_out: form.check_out, num_guests: numGuests, message: form.message || null, status: form.status, admin_notes: discountNote, rental_option: form.rental_option },
        addons,
        pricing: { lodge_total: lodgeTotal, addons_total: addonsTotal, total_price: total, deposit_amount: deposit },
      })
      onCreated(res.id)
    } catch (err) { alert('Kunde inte skapa bokning: ' + err.message) }
    finally { setSaving(false) }
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', zIndex: 1000, overflowY: 'auto' }
  const panel = { background: 'var(--admin-card-bg, #fff)', color: 'var(--admin-text, inherit)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '560px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Ny bokning</h2>
          <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={onClose}>✕</button>
        </div>

        {loading ? <div className="admin-loading">Laddar…</div> : (
          <>
            <h3 style={{ marginTop: 0 }}>Gäst</h3>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Namn *</span>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '60%' }} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>E-post *</span>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '60%' }} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Telefon</span>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '60%' }} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Org.nr / personnr</span>
              <input type="text" value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} style={{ width: '60%' }} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Språk</span>
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="sv">SV</option><option value="en">EN</option><option value="de">DE</option><option value="fr">FR</option>
              </select></label>

            <h3>Bokning</h3>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Incheckning *</span>
              <input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Utcheckning *</span>
              <input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Boende</span>
              <select value={form.rental_option}
                onChange={e => {
                  const ro = e.target.value
                  const max = api.maxGuestsFor(settings, ro)
                  setForm(f => ({ ...f, rental_option: ro, num_guests: Math.min(parseInt(f.num_guests, 10) || 1, max) }))
                }}>
                {rentalOptionChoices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Gäster</span>
              <input type="number" min="1" max={api.maxGuestsFor(settings, form.rental_option)} value={form.num_guests}
                onChange={e => setForm(f => ({ ...f, num_guests: e.target.value }))} style={{ width: '80px', textAlign: 'right' }} /></label>
            <label className="detail-row" style={{ alignItems: 'center' }}><span>Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {statusOptions.filter(o => o.value !== 'all').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></label>

            <h3>Tillval</h3>
            {allAddons.length === 0 && <div className="detail-row"><span style={{ color: 'var(--admin-text-muted)' }}>Inga tillval tillgängliga</span></div>}
            {allAddons.map(a => {
              const name = a.translations?.sv?.name || a.translations?.en?.name || a.slug
              const sel = addonSel[a.id]
              const isPerDay = a.price_type === 'per_day'
              return (
                <div key={a.id} style={{ borderTop: '1px solid var(--admin-border, #eee)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <label className="detail-row" style={{ alignItems: 'center', borderTop: 'none' }}>
                    <span>
                      <input type="checkbox" checked={!!sel?.selected} onChange={() => toggleAddon(a.id)} style={{ marginRight: '0.5rem' }} />
                      {name}
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginLeft: '1.5rem' }}>
                        {isPerDay ? 'Per dag' : a.price_type === 'per_person' ? `Per person (× ${numGuests})` : 'Fast pris'} · {formatPrice(effPrice(a))}
                      </span>
                    </span>
                    <strong>{formatPrice(addonLineTotal(a))}</strong>
                  </label>
                  {sel?.selected && isPerDay && (
                    <div style={{ marginLeft: '1.5rem', marginTop: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Antal dagar:{' '}
                        <input type="number" min="1" max={nights || 1} value={sel.days || nights || 1}
                          onChange={e => setAddonDays(a.id, e.target.value)} style={{ width: '60px', textAlign: 'right' }} />
                      </label>
                      {nights > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                          {stayDates().map(dStr => {
                            const chosen = (sel.dates || []).includes(dStr)
                            return (
                              <button key={dStr} type="button"
                                className={`admin-btn admin-btn-xs ${chosen ? 'admin-btn-confirm' : 'admin-btn-secondary'}`}
                                onClick={() => toggleAddonDate(a.id, dStr, sel.days || nights || 1)}>
                                {new Date(dStr + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ borderTop: '2px solid var(--admin-border, #ddd)', marginTop: '1rem', paddingTop: '0.75rem' }}>
              <div className="detail-row"><span>Lodge ({nights > 0 ? nights : 0} nätter)</span><strong>{formatPrice(lodgeTotal)}</strong></div>
              <div className="detail-row"><span>Tillval</span><strong>{formatPrice(addonsTotal)}</strong></div>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Rabatt på totalpris
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                    Ordinarie: {formatPrice(baseTotal)}{discountNum > 0 ? ` · −${discountPct} %` : ''}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input type="number" min="0" step="100" value={discountAmount} placeholder="0"
                    onChange={e => setDiscountAmount(e.target.value)}
                    style={{ width: '110px', textAlign: 'right' }} />
                  <span style={{ color: 'var(--admin-text-muted)' }}>kr</span>
                </span>
              </label>
              <div className="detail-row total"><span>Totalt</span><strong>{formatPrice(total)}</strong></div>
              <div className="detail-row"><span>Deposition</span><strong>{formatPrice(deposit)}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={submit} disabled={saving}>{saving ? 'Skapar…' : 'Skapa bokning'}</button>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onClose} disabled={saving}>Avbryt</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const BookingsPage = () => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—'
  const formatPrice = (p) => new Intl.NumberFormat('sv-SE').format(p) + ' kr'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>Bokningar</h1>
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setShowNew(true)}>+ Ny bokning</button>
      </div>

      {showNew && (
        <NewBookingModal
          onClose={() => setShowNew(false)}
          onCreated={(bid) => { setShowNew(false); navigate(`/admin/bookings/${bid}`) }}
        />
      )}

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
                      <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => navigate(`/admin/bookings/${b.id}`)}>
                        Öppna
                      </button>
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
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceForm, setPriceForm] = useState({ discount: '', deposit_amount: '', reason: '' })
  const [savingPrice, setSavingPrice] = useState(false)
  const [settings, setSettings] = useState({})
  const [allAddons, setAllAddons] = useState([])
  const [editingGuest, setEditingGuest] = useState(false)
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '', id_number: '', language: 'sv', marketing_consent: false })
  const [savingGuest, setSavingGuest] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailsForm, setDetailsForm] = useState({ check_in: '', check_out: '', num_guests: 1, rental_option: 'full_lodge' })
  const [savingDetails, setSavingDetails] = useState(false)
  const [editingAddons, setEditingAddons] = useState(false)
  const [addAddonId, setAddAddonId] = useState('')

  const loadBooking = useCallback(async () => {
    try {
      const [data, all, settingsData, addonsData] = await Promise.all([
        api.getBookingById(id),
        api.getBookings({ status: 'all', limit: 500 }),
        api.getSettings(),
        api.getAddons(),
      ])
      setBooking(data)
      setAllBookings(all.data)
      setSettings(settingsData || {})
      setAllAddons(addonsData || [])
      setNotes(data.admin_notes || '')
    } catch (err) {
      console.error('Failed to load booking:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadBooking() }, [loadBooking])

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      const confirmed = window.confirm(
        `Avboka bokning ${booking.reference}?\n\n` +
        `Bokningens status ändras till "Avbokad" men all data behålls i databasen. ` +
        `Datumen blir lediga igen och kan bokas av andra gäster.`
      )
      if (!confirmed) return
    }

    if (newStatus === 'declined') {
      const confirmed = window.confirm(
        `Neka bokning ${booking.reference}?\n\n` +
        `Förfrågan från ${booking.guests?.name || 'gästen'} markeras som nekad. ` +
        `Ett mejl skickas automatiskt till gästen. Data behålls i databasen.`
      )
      if (!confirmed) return
    }

    if (newStatus === 'confirmed') {
      const confirmed = window.confirm(
        `Godkänn bokning ${booking.reference}?\n\n` +
        `Bokningen markeras som bekräftad och ett mejl med betalningsinstruktioner skickas till ${booking.guests?.name || 'gästen'}.`
      )
      if (!confirmed) return
    }

    if (newStatus === 'pending') {
      const confirmed = window.confirm(
        `Återställ bokning ${booking.reference} till väntande?\n\n` +
        `Bokningen kan sedan godkännas eller nekas på nytt. Inget mejl skickas till gästen.`
      )
      if (!confirmed) return
    }

    try {
      await api.updateBookingStatus(id, newStatus)

      // Skicka mail efter lyckad status-uppdatering
      if (newStatus === 'confirmed' || newStatus === 'declined') {
        const eventType = newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_declined'
        const mailResult = await api.sendStatusEmail(id, eventType)
        if (!mailResult.ok) {
          alert(`Status uppdaterades, men mejlet kunde inte skickas: ${mailResult.error}\n\nKontakta gästen manuellt.`)
        }
      }

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

  const startEditPrice = () => {
    const base = (booking.lodge_total || 0) + (booking.addons_total || 0)
    const currentDiscount = Math.max(0, base - (booking.total_price || 0))
    setPriceForm({
      discount: currentDiscount || '',
      deposit_amount: booking.deposit_amount ?? 0,
      reason: '',
    })
    setEditingPrice(true)
  }

  const savePrice = async () => {
    const base = (booking.lodge_total || 0) + (booking.addons_total || 0)
    const discount = Math.min(Math.max(0, parseInt(priceForm.discount, 10) || 0), base)
    const deposit = parseInt(priceForm.deposit_amount, 10)
    if (Number.isNaN(deposit) || deposit < 0) {
      alert('Ange ett giltigt depositionsbelopp (0 eller högre).')
      return
    }
    const total = base - discount
    setSavingPrice(true)
    try {
      await api.updateBookingPrice(id, {
        total_price: total,
        deposit_amount: deposit,
        reason: priceForm.reason,
      })
      setEditingPrice(false)
      loadBooking()
    } catch (err) {
      alert('Kunde inte spara priset: ' + err.message)
    } finally {
      setSavingPrice(false)
    }
  }

  // ── Gästuppgifter ──
  const startEditGuest = () => {
    setGuestForm({
      name: booking.guests?.name || '',
      email: booking.guests?.email || '',
      phone: booking.guests?.phone || '',
      id_number: booking.guests?.id_number || '',
      language: booking.guests?.language || 'sv',
      marketing_consent: !!booking.guests?.marketing_consent,
    })
    setEditingGuest(true)
  }
  const saveGuest = async () => {
    if (!guestForm.name.trim() || !guestForm.email.trim()) { alert('Namn och e-post krävs.'); return }
    setSavingGuest(true)
    try {
      await api.updateGuest(booking.guests.id, {
        name: guestForm.name.trim(),
        email: guestForm.email.trim(),
        phone: guestForm.phone.trim() || null,
        id_number: guestForm.id_number.trim() || null,
        language: guestForm.language,
        marketing_consent: guestForm.marketing_consent,
      })
      setEditingGuest(false)
      loadBooking()
    } catch (err) { alert('Kunde inte spara gästuppgifter: ' + err.message) }
    finally { setSavingGuest(false) }
  }

  // ── Bokningsdetaljer ──
  const startEditDetails = () => {
    setDetailsForm({
      check_in: booking.check_in?.substring(0, 10) || '',
      check_out: booking.check_out?.substring(0, 10) || '',
      num_guests: booking.num_guests || 1,
      rental_option: booking.rental_option || 'full_lodge',
    })
    setEditingDetails(true)
  }
  const saveDetails = async () => {
    const check_in = detailsForm.check_in
    const check_out = detailsForm.check_out
    const num_guests = parseInt(detailsForm.num_guests, 10)
    const rental_option = detailsForm.rental_option || 'full_lodge'
    if (!check_in || !check_out) { alert('Ange in- och utcheckningsdatum.'); return }
    if (new Date(check_out) <= new Date(check_in)) { alert('Utcheckning måste vara efter incheckning.'); return }
    if (Number.isNaN(num_guests) || num_guests < 1) { alert('Ange giltigt antal gäster.'); return }

    const changed =
      check_in !== booking.check_in?.substring(0, 10) ||
      check_out !== booking.check_out?.substring(0, 10) ||
      num_guests !== booking.num_guests ||
      rental_option !== (booking.rental_option || 'full_lodge')

    let pricing = null
    if (changed) {
      const nights = api.nightsBetween(check_in, check_out)
      const perNight = api.lodgePricePerNight(num_guests, settings, rental_option)
      const newLodge = perNight * nights
      const addonsTotal = booking.addons_total || 0
      const recalc = window.confirm(
        `Räkna om lodge-priset?\n\n` +
        `Nytt lodge-pris: ${nights} nätter × ${new Intl.NumberFormat('sv-SE').format(perNight)} kr = ${new Intl.NumberFormat('sv-SE').format(newLodge)} kr\n` +
        `Nuvarande lodge-pris: ${new Intl.NumberFormat('sv-SE').format(booking.lodge_total || 0)} kr\n\n` +
        `Tillval (${new Intl.NumberFormat('sv-SE').format(addonsTotal)} kr) räknas inte om automatiskt — justera dem separat vid behov.\n\n` +
        `OK = räkna om lodge + total.  Avbryt = behåll nuvarande priser.`
      )
      if (recalc) {
        pricing = { lodge_total: newLodge, addons_total: addonsTotal, total_price: newLodge + addonsTotal }
      }
    }

    setSavingDetails(true)
    try {
      await api.updateBookingDetails(id, { check_in, check_out, num_guests, rental_option, pricing })
      setEditingDetails(false)
      loadBooking()
    } catch (err) { alert('Kunde inte spara bokningsdetaljer: ' + err.message) }
    finally { setSavingDetails(false) }
  }

  // ── Tillval (full redigering, varje ändring sparas direkt) ──
  const stayDates = () => {
    if (!booking.check_in || !booking.check_out) return []
    const out = []
    const d = new Date(booking.check_in + 'T00:00:00')
    const end = new Date(booking.check_out + 'T00:00:00')
    while (d < end) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      d.setDate(d.getDate() + 1)
    }
    return out
  }
  const handleAddAddon = async () => {
    const addon = allAddons.find(a => a.id === addAddonId)
    if (!addon) return
    const numGuests = booking.num_guests || 1
    const nights = api.nightsBetween(booking.check_in, booking.check_out)
    let quantity = 1
    if (addon.price_type === 'per_day') quantity = nights || 1
    else if (addon.price_type === 'per_person') quantity = numGuests
    const isLillstuga = (booking.rental_option || 'full_lodge') === 'lillstuga'
    const cleaningPrice = parseInt(settings.lillstuga_cleaning_price) || 700
    const unit_price = ((addon.slug === 'cleaning' || addon.id === 'cleaning') && isLillstuga) ? cleaningPrice : addon.price
    const total_price = api.addonRowTotal({ ...addon, price: unit_price }, { quantity, numGuests })
    try {
      await api.addBookingAddon(id, { addon_id: addon.id, quantity, unit_price, total_price, selected_dates: null })
      setAddAddonId('')
      loadBooking()
    } catch (err) { alert('Kunde inte lägga till tillval: ' + err.message) }
  }
  const handleRemoveAddon = async (ba) => {
    if (!window.confirm('Ta bort detta tillval?')) return
    try { await api.deleteBookingAddon(ba.id, id); loadBooking() }
    catch (err) { alert('Kunde inte ta bort tillval: ' + err.message) }
  }
  const handleAddonQty = async (ba, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1)
    const numGuests = booking.num_guests || 1
    const total_price = api.addonRowTotal({ price_type: ba.addons?.price_type, unit_price: ba.unit_price }, { quantity: qty, numGuests })
    let selected_dates = ba.selected_dates || null
    if (selected_dates && selected_dates.length > qty) selected_dates = selected_dates.slice(0, qty)
    try { await api.updateBookingAddon(ba.id, id, { quantity: qty, total_price, selected_dates }); loadBooking() }
    catch (err) { alert('Kunde inte ändra antal: ' + err.message) }
  }
  const handleToggleAddonDate = async (ba, dateStr) => {
    const current = ba.selected_dates || []
    let next
    if (current.includes(dateStr)) next = current.filter(d => d !== dateStr)
    else {
      if (current.length >= ba.quantity) { alert(`Du kan välja högst ${ba.quantity} dagar. Öka antalet först.`); return }
      next = [...current, dateStr].sort()
    }
    try { await api.updateBookingAddon(ba.id, id, { selected_dates: next }); loadBooking() }
    catch (err) { alert('Kunde inte uppdatera dagar: ' + err.message) }
  }

  const handlePayment = async (type, label) => {
    const confirmed = window.confirm(`Markera "${label}" som mottagen för bokning ${booking.reference}?`)
    if (!confirmed) return
    try {
      await api.setBookingPayment(id, type, new Date().toISOString())
      loadBooking()
    } catch (err) {
      alert('Kunde inte registrera betalningen: ' + err.message)
    }
  }

  const handleUnpayment = async (type, label) => {
    const confirmed = window.confirm(`Ångra registreringen av "${label}" för bokning ${booking.reference}?`)
    if (!confirmed) return
    try {
      await api.setBookingPayment(id, type, null)
      loadBooking()
    } catch (err) {
      alert('Kunde inte ångra betalningen: ' + err.message)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Radera bokning ${booking.reference} permanent?\n\n` +
      `Detta tar bort bokningen, dess tillval och eventuella betalningar ur databasen. ` +
      `Mejlloggar behålls men kopplas loss från bokningen. Gästen ${booking.guests?.name || ''} ` +
      `lämnas kvar i gästregistret.\n\nÅtgärden kan inte ångras.`
    )
    if (!confirmed) return

    try {
      await api.deleteBooking(id)
      navigate('/admin/bookings')
    } catch (err) {
      alert('Kunde inte radera bokningen: ' + err.message)
    }
  }

  // Öppna en ren, printbar sammanställning av bokningen i ett nytt fönster
  // och trigga utskrift. Allt sker i frontend — inget skickas någonstans.
  const handlePrint = () => {
    if (!booking) return
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—'
    const fmtPrice = (p) => new Intl.NumberFormat('sv-SE').format(p || 0) + ' kr'
    const nights = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000)
    const baseTotal = (booking.lodge_total || 0) + (booking.addons_total || 0)
    const discount = baseTotal > (booking.total_price || 0) ? baseTotal - booking.total_price : 0
    const discountPct = discount > 0 && baseTotal > 0 ? Math.round((discount / baseTotal) * 100) : 0
    const statusLabel = statusOptions.find(o => o.value === booking.status)?.label || booking.status
    const rentalLabel = rentalOptionLabel(booking.rental_option)
    const g = booking.guests || {}
    const addonRows = (booking.booking_addons || []).map(ba => {
      const name = ba.addons?.translations?.sv?.name || ba.addons?.translations?.en?.name || ba.addons?.slug || 'Tillval'
      const dates = (ba.selected_dates && ba.selected_dates.length)
        ? ba.selected_dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })).join(', ')
        : ''
      return `<tr><td>${esc(name)}${ba.quantity > 1 ? ` (× ${ba.quantity})` : ''}${dates ? `<div class="muted">${esc(dates)}</div>` : ''}</td><td class="right">${fmtPrice(ba.total_price)}</td></tr>`
    }).join('') || '<tr><td class="muted">Inga tillval</td><td></td></tr>'

    const payRow = (label, ts, amount) => `<tr><td>${label}</td><td class="right">${fmtPrice(amount)}</td><td class="right">${ts ? 'Mottagen ' + fmtDate(ts) : 'Ej mottagen'}</td></tr>`
    const advance = Math.round((booking.total_price || 0) * 0.5)
    const finalPay = (booking.total_price || 0) - advance
    const payments = payRow('Bokningsavgift (50%)', booking.advance_paid_at, advance)
      + payRow('Slutbetalning (50%)', booking.final_paid_at, finalPay)
      + payRow('Deposition', booking.deposit_paid_at, booking.deposit_amount)

    const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>Bokning ${esc(booking.reference)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#1A1A1A;margin:0;padding:32px}
  .wrap{max-width:720px;margin:0 auto}
  header{border-bottom:3px solid #E38A05;padding-bottom:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end}
  h1{font-size:22px;margin:0}
  .sub{color:#6B6B6B;font-size:13px;margin-top:2px}
  .ref{font-size:20px;font-weight:700;color:#E38A05}
  .status{display:inline-block;font-size:12px;font-weight:600;padding:3px 10px;border-radius:12px;background:#f0ede6;color:#333;margin-top:4px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#6B6B6B;margin:22px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:6px 0;border-bottom:1px solid #eee;vertical-align:top}
  .right{text-align:right;white-space:nowrap}
  .muted{color:#8a8578;font-size:12px}
  .total td{border-top:2px solid #E38A05;border-bottom:none;font-weight:700;font-size:16px;padding-top:10px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:14px}
  .grid div span{color:#6B6B6B}
  footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;color:#8a8578;font-size:12px}
  @media print{body{padding:0}}
</style></head><body><div class="wrap">
  <header>
    <div><h1>Vilhelmina Lodge</h1><div class="sub">Bokningssammanställning · Flightmode Adventures</div></div>
    <div style="text-align:right"><div class="ref">${esc(booking.reference)}</div><div class="status">${esc(statusLabel)}</div></div>
  </header>
  <h2>Gäst</h2>
  <div class="grid">
    <div><span>Namn:</span> ${esc(g.name)}</div>
    <div><span>E-post:</span> ${esc(g.email)}</div>
    <div><span>Telefon:</span> ${esc(g.phone || '—')}</div>
    ${g.id_number ? `<div><span>Org.nr / personnr:</span> ${esc(g.id_number)}</div>` : ''}
    <div><span>Språk:</span> ${esc((g.language || '').toUpperCase())}</div>
  </div>
  <h2>Vistelse</h2>
  <div class="grid">
    <div><span>Boende:</span> ${esc(rentalLabel)}</div>
    <div><span>Gäster:</span> ${booking.num_guests}</div>
    <div><span>Incheckning:</span> ${fmtDate(booking.check_in)}</div>
    <div><span>Utcheckning:</span> ${fmtDate(booking.check_out)}</div>
    <div><span>Nätter:</span> ${nights}</div>
  </div>
  <h2>Tillval</h2>
  <table>${addonRows}</table>
  <h2>Priser</h2>
  <table>
    <tr><td>Boende</td><td class="right">${fmtPrice(booking.lodge_total)}</td></tr>
    <tr><td>Tillval</td><td class="right">${fmtPrice(booking.addons_total)}</td></tr>
    ${discount > 0 ? `<tr><td>Delsumma</td><td class="right" style="color:#8a8578">${fmtPrice(baseTotal)}</td></tr>` : ''}
    ${discount > 0 ? `<tr><td>Rabatt</td><td class="right" style="color:#568C03">−${fmtPrice(discount)} (${discountPct}%)</td></tr>` : ''}
    <tr class="total"><td>Totalt</td><td class="right">${fmtPrice(booking.total_price)}</td></tr>
  </table>
  <h2>Betalning</h2>
  <table>${payments}</table>
  ${booking.message ? `<h2>Meddelande från gäst</h2><div style="font-size:14px;white-space:pre-wrap">${esc(booking.message)}</div>` : ''}
  ${booking.admin_notes ? `<h2>Interna anteckningar</h2><div style="font-size:13px;white-space:pre-wrap;color:#555">${esc(booking.admin_notes)}</div>` : ''}
  <footer>Flightmode Adventures AB · info@flightmode.se<br>Utskrivet ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</footer>
</div></body></html>`

    const w = window.open('', '_blank', 'width=820,height=920')
    if (!w) { alert('Kunde inte öppna utskriftsfönstret. Tillåt popup-fönster för sidan och försök igen.'); return }
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { try { w.print() } catch (e) { /* användaren kan skriva ut manuellt */ } }, 300)
  }

  if (loading) return <div className="admin-loading">Laddar bokning...</div>
  if (!booking) return <div className="admin-error">Bokningen kunde inte hittas.</div>

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—'
  const formatPrice = (p) => new Intl.NumberFormat('sv-SE').format(p) + ' kr'
  const nightCount = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24))
  // Rabatt på totalpris = (lodge + tillval) − faktiskt totalpris, om lägre.
  const baseTotal = (booking.lodge_total || 0) + (booking.addons_total || 0)
  const discount = baseTotal > (booking.total_price || 0) ? baseTotal - booking.total_price : 0
  const discountPct = discount > 0 && baseTotal > 0 ? Math.round((discount / baseTotal) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/admin/bookings')}>
          ← Tillbaka
        </button>
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handlePrint}>
          🖨 Skriv ut
        </button>
      </div>

      <div className="detail-header">
        <h1 className="admin-page-title">{booking.reference}</h1>
        <span className={`admin-badge-status ${statusBadgeClass[booking.status]}`}>
          {statusOptions.find(o => o.value === booking.status)?.label || booking.status}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Gästuppgifter</h3>
            {!editingGuest && (
              <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={startEditGuest}>Justera</button>
            )}
          </div>
          {editingGuest ? (
            <div style={{ marginTop: '0.75rem' }}>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Namn</span>
                <input type="text" value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))} style={{ width: '60%' }} />
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>E-post</span>
                <input type="email" value={guestForm.email} onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))} style={{ width: '60%' }} />
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Telefon</span>
                <input type="text" value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '60%' }} />
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Org.nr / personnr</span>
                <input type="text" value={guestForm.id_number} onChange={e => setGuestForm(f => ({ ...f, id_number: e.target.value }))} style={{ width: '60%' }} />
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Språk</span>
                <select value={guestForm.language} onChange={e => setGuestForm(f => ({ ...f, language: e.target.value }))}>
                  <option value="sv">SV</option>
                  <option value="en">EN</option>
                  <option value="de">DE</option>
                  <option value="fr">FR</option>
                </select>
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Marknadsföring</span>
                <input type="checkbox" checked={guestForm.marketing_consent} onChange={e => setGuestForm(f => ({ ...f, marketing_consent: e.target.checked }))} />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={saveGuest} disabled={savingGuest}>{savingGuest ? 'Sparar…' : 'Spara'}</button>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingGuest(false)} disabled={savingGuest}>Avbryt</button>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-row"><span>Namn</span><strong>{booking.guests?.name}</strong></div>
              <div className="detail-row"><span>E-post</span><strong>{booking.guests?.email}</strong></div>
              <div className="detail-row"><span>Telefon</span><strong>{booking.guests?.phone || '—'}</strong></div>
              {booking.guests?.id_number && <div className="detail-row"><span>Org.nr / personnr</span><strong>{booking.guests.id_number}</strong></div>}
              <div className="detail-row"><span>Språk</span><strong>{booking.guests?.language?.toUpperCase()}</strong></div>
              {booking.guests?.marketing_consent && <div className="detail-row"><span>Marknadsföring</span><strong>Ja</strong></div>}
            </>
          )}
        </div>

        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Bokningsdetaljer</h3>
            {!editingDetails && (
              <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={startEditDetails}>Justera</button>
            )}
          </div>
          {editingDetails ? (
            <div style={{ marginTop: '0.75rem' }}>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Incheckning</span>
                <input type="date" value={detailsForm.check_in} onChange={e => setDetailsForm(f => ({ ...f, check_in: e.target.value }))} />
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Utcheckning</span>
                <input type="date" value={detailsForm.check_out} onChange={e => setDetailsForm(f => ({ ...f, check_out: e.target.value }))} />
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Boende</span>
                <select value={detailsForm.rental_option}
                  onChange={e => {
                    const ro = e.target.value
                    const max = api.maxGuestsFor(settings, ro)
                    setDetailsForm(f => ({ ...f, rental_option: ro, num_guests: Math.min(parseInt(f.num_guests, 10) || 1, max) }))
                  }}>
                  {rentalOptionChoices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Gäster</span>
                <input type="number" min="1" max={api.maxGuestsFor(settings, detailsForm.rental_option)} value={detailsForm.num_guests}
                  onChange={e => setDetailsForm(f => ({ ...f, num_guests: e.target.value }))} style={{ width: '80px', textAlign: 'right' }} />
              </label>
              <p style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', margin: '0.5rem 0 0.75rem 0' }}>
                Vid ändrat boende, datum eller antal gäster får du en fråga om lodge-priset ska räknas om.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={saveDetails} disabled={savingDetails}>{savingDetails ? 'Sparar…' : 'Spara'}</button>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingDetails(false)} disabled={savingDetails}>Avbryt</button>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-row"><span>Incheckning</span><strong>{formatDate(booking.check_in)}</strong></div>
              <div className="detail-row"><span>Utcheckning</span><strong>{formatDate(booking.check_out)}</strong></div>
              <div className="detail-row"><span>Nätter</span><strong>{nightCount}</strong></div>
              <div className="detail-row"><span>Gäster</span><strong>{booking.num_guests}</strong></div>
              <div className="detail-row"><span>Boende</span><strong>{rentalOptionLabel(booking.rental_option)}</strong></div>
              <div className="detail-row"><span>Skapad</span><strong>{formatDate(booking.created_at)}</strong></div>
            </>
          )}
        </div>

        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Priser</h3>
            {!editingPrice && (
              <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={startEditPrice}>Justera</button>
            )}
          </div>

          {editingPrice ? (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="detail-row"><span>Lodge</span><strong>{formatPrice(booking.lodge_total)}</strong></div>
              <div className="detail-row"><span>Tillval</span><strong>{formatPrice(booking.addons_total)}</strong></div>
              <div className="detail-row"><span>Delsumma</span><strong>{formatPrice(baseTotal)}</strong></div>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Rabatt på totalpris
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Ange rabatt i kr · lämna 0 om ingen</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input type="number" min="0" step="100" value={priceForm.discount} placeholder="0"
                    onChange={e => setPriceForm(f => ({ ...f, discount: e.target.value }))}
                    style={{ width: '110px', textAlign: 'right' }} />
                  <span>kr</span>
                </span>
              </label>
              <div className="detail-row total"><span>Totalt</span><strong>{formatPrice(Math.max(0, baseTotal - Math.min(Math.max(0, parseInt(priceForm.discount, 10) || 0), baseTotal)))}</strong></div>
              <label className="detail-row" style={{ alignItems: 'center' }}>
                <span>Deposition</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input type="number" min="0" step="100" value={priceForm.deposit_amount}
                    onChange={e => setPriceForm(f => ({ ...f, deposit_amount: e.target.value }))}
                    style={{ width: '110px', textAlign: 'right' }} />
                  <span>kr</span>
                </span>
              </label>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.25rem' }}>
                  Anledning (valfritt — sparas i anteckningar)
                </label>
                <input type="text" value={priceForm.reason} placeholder="T.ex. Rabatt återkommande gäst"
                  onChange={e => setPriceForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', margin: '0.5rem 0 0.75rem 0' }}>
                Betalningarna (50 % / 50 %) räknas om automatiskt utifrån det nya totalpriset.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={savePrice} disabled={savingPrice}>
                  {savingPrice ? 'Sparar…' : 'Spara'}
                </button>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingPrice(false)} disabled={savingPrice}>
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-row"><span>Lodge</span><strong>{formatPrice(booking.lodge_total)}</strong></div>
              <div className="detail-row"><span>Tillval</span><strong>{formatPrice(booking.addons_total)}</strong></div>
              {discount > 0 && (
                <>
                  <div className="detail-row"><span>Delsumma</span><strong style={{ fontWeight: 400, color: 'var(--admin-text-muted)' }}>{formatPrice(baseTotal)}</strong></div>
                  <div className="detail-row"><span>Rabatt</span><strong style={{ color: 'var(--admin-success, #568C03)' }}>−{formatPrice(discount)} ({discountPct}%)</strong></div>
                </>
              )}
              <div className="detail-row total"><span>Totalt</span><strong>{formatPrice(booking.total_price)}</strong></div>
              <div className="detail-row"><span>Deposition</span><strong>{formatPrice(booking.deposit_amount)}</strong></div>
            </>
          )}
        </div>

        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Tillval</h3>
            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => setEditingAddons(v => !v)}>
              {editingAddons ? 'Klar' : 'Justera'}
            </button>
          </div>

          {(!booking.booking_addons || booking.booking_addons.length === 0) && !editingAddons && (
            <div className="detail-row"><span style={{ color: 'var(--admin-text-muted)' }}>Inga tillval</span></div>
          )}

          {booking.booking_addons?.map(ba => {
            const addonName = ba.addons?.translations?.sv?.name || ba.addons?.translations?.en?.name || ba.addons?.slug
            const priceType = ba.addons?.price_type
            const isPerDay = priceType === 'per_day'
            const hasSelectedDates = ba.selected_dates && ba.selected_dates.length > 0
            return (
              <div key={ba.id} style={{ borderTop: '1px solid var(--admin-border, #eee)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <div className="detail-row" style={{ borderTop: 'none', alignItems: 'center' }}>
                  <span>
                    {addonName}
                    {!editingAddons && <> × {ba.quantity}</>}
                    {editingAddons && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        {isPerDay ? 'Per dag' : priceType === 'per_person' ? `Per person (× ${booking.num_guests})` : 'Fast pris'} · {formatPrice(ba.unit_price)}
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {editingAddons && isPerDay && (
                      <input type="number" min="1" max={nightCount} value={ba.quantity}
                        onChange={e => handleAddonQty(ba, e.target.value)}
                        style={{ width: '60px', textAlign: 'right' }} />
                    )}
                    <strong>{formatPrice(ba.total_price)}</strong>
                    {editingAddons && (
                      <button className="admin-btn admin-btn-decline admin-btn-xs" onClick={() => handleRemoveAddon(ba)}>Ta bort</button>
                    )}
                  </span>
                </div>

                {editingAddons && isPerDay ? (
                  <div style={{ marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>Valda dagar ({(ba.selected_dates || []).length}/{ba.quantity}):</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                      {stayDates().map(dStr => {
                        const chosen = (ba.selected_dates || []).includes(dStr)
                        return (
                          <button key={dStr} type="button"
                            className={`admin-btn admin-btn-xs ${chosen ? 'admin-btn-confirm' : 'admin-btn-secondary'}`}
                            onClick={() => handleToggleAddonDate(ba, dStr)}>
                            {new Date(dStr + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : hasSelectedDates && (
                  <div className="detail-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                      Valda dagar: {ba.selected_dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {editingAddons && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px dashed var(--admin-border, #ddd)', paddingTop: '0.75rem' }}>
              <select value={addAddonId} onChange={e => setAddAddonId(e.target.value)} style={{ flex: 1 }}>
                <option value="">Lägg till tillval…</option>
                {allAddons
                  .filter(a => !booking.booking_addons?.some(ba => ba.addon_id === a.id))
                  .map(a => {
                    const name = a.translations?.sv?.name || a.translations?.en?.name || a.slug
                    const isLillstuga = (booking.rental_option || 'full_lodge') === 'lillstuga'
                    const p = (a.slug === 'cleaning' && isLillstuga) ? (parseInt(settings.lillstuga_cleaning_price) || 700) : a.price
                    return <option key={a.id} value={a.id}>{name} ({formatPrice(p)})</option>
                  })}
              </select>
              <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={handleAddAddon} disabled={!addAddonId}>Lägg till</button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-card" style={{ marginTop: '1rem' }}>
        <h3>Betalningar</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', margin: '0 0 0.75rem 0' }}>
          Bokningsavgiften krävs för att bokningen ska vara giltig (bekräftas automatiskt vid registrering).
          Slutbetalning ska ske senast 30 dagar före ankomst.
        </p>
        {[
          { type: 'advance', label: 'Bokningsavgift (50%)', amount: Math.round((booking.total_price || 0) * 0.5), paidAt: booking.advance_paid_at, hint: 'Krävs för bekräftelse' },
          { type: 'final', label: 'Slutbetalning (50%)', amount: Math.round((booking.total_price || 0) * 0.5), paidAt: booking.final_paid_at, hint: 'Senast 30 dagar före ankomst' },
          { type: 'deposit_paid', label: 'Säkerhetsdeposition', amount: booking.deposit_amount || 0, paidAt: booking.deposit_paid_at, hint: 'Återbetalas efter godkänd avsyning' },
        ].map(row => (
          <div key={row.type} className="detail-row" style={{ alignItems: 'center' }}>
            <span>
              {row.label}
              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{row.hint}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong>{formatPrice(row.amount)}</strong>
              {row.paidAt ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#568C03', fontSize: '0.85rem' }}>✓ {formatDate(row.paidAt)}</span>
                  <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleUnpayment(row.type, row.label)}>Ångra</button>
                </span>
              ) : (
                <button className="admin-btn admin-btn-confirm admin-btn-xs" onClick={() => handlePayment(row.type, row.label)}>
                  Markera mottagen
                </button>
              )}
            </span>
          </div>
        ))}

        {booking.deposit_paid_at && (
          <div className="detail-row" style={{ alignItems: 'center', borderTop: '1px dashed var(--admin-border, #ddd)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
            <span>
              Återbetalning av deposition
              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>Efter godkänd avsyning</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong>{formatPrice(booking.deposit_amount || 0)}</strong>
              {booking.deposit_refunded_at ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#568C03', fontSize: '0.85rem' }}>✓ {formatDate(booking.deposit_refunded_at)}</span>
                  <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleUnpayment('deposit_refunded', 'Återbetalning av deposition')}>Ångra</button>
                </span>
              ) : (
                <button className="admin-btn admin-btn-confirm admin-btn-xs" onClick={() => handlePayment('deposit_refunded', 'Återbetalning av deposition')}>
                  Markera återbetald
                </button>
              )}
            </span>
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
          {(booking.status === 'declined' || booking.status === 'cancelled') && (
            <button className="admin-btn admin-btn-secondary" onClick={() => handleStatusChange('pending')}>
              Återställ till väntande
            </button>
          )}
        </div>
      </div>

      <div className="detail-card danger-zone" style={{ marginTop: '2rem', borderColor: '#C0392B' }}>
        <h3 style={{ color: '#C0392B' }}>Farlig zon</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', margin: '0 0 0.75rem 0' }}>
          Radera bokningen permanent ur databasen. Tillval och betalningar följer med. Gäst och mejllogg lämnas kvar.
          Använd hellre <strong>Neka</strong> eller <strong>Avboka</strong> om du vill behålla historiken.
        </p>
        <button className="admin-btn admin-btn-decline admin-btn-sm" onClick={handleDelete}>
          Radera bokning permanent
        </button>
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

    // Generate all dates in range. Formatera i LOKAL tid — toISOString() ger UTC,
    // vilket i tidszoner öster om UTC (t.ex. svensk sommartid, UTC+2) flyttar
    // datumet en dag bakåt så att fel dag blockeras.
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dates = []
    const current = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    while (current <= end) {
      dates.push(fmt(current))
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
      // check_out day is treated as occupied (cleaning time) — matches public calendar and hasDateConflict
      if (dateStr >= toDateStr(b.check_in) && dateStr <= toDateStr(b.check_out)) {
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
      // check_out day is treated as occupied (cleaning time) — matches public calendar and hasDateConflict
      if (dateStr >= toDateStr(b.check_in) && dateStr <= toDateStr(b.check_out)) {
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
  const [editingSeason, setEditingSeason] = useState(null)

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

  // ---- Säsongspriser (datum + priser per säsong) ----
  const numOr = (v, d) => { const n = parseInt(v); return Number.isNaN(n) ? d : n }
  // Effektiva priser för en säsong: säsongens egna prices, annars globala fallback.
  const seasonPriceDefaults = (season) => {
    const p = season.prices || {}
    return {
      price_per_person_per_night: p.price_per_person_per_night != null ? p.price_per_person_per_night : numOr(settings.price_per_person_per_night, 950),
      min_price_per_night: p.min_price_per_night != null ? p.min_price_per_night : numOr(settings.min_price_per_night, 4000),
      lillstuga_min_price_per_night: p.lillstuga_min_price_per_night != null ? p.lillstuga_min_price_per_night : numOr(settings.lillstuga_min_price_per_night, 2000),
      deposit_amount: p.deposit_amount != null ? p.deposit_amount : numOr(settings.deposit_amount, 5000),
      lillstuga_cleaning_price: p.lillstuga_cleaning_price != null ? p.lillstuga_cleaning_price : numOr(settings.lillstuga_cleaning_price, 700),
      addons: Object.fromEntries((addons || []).map(a => [a.slug, (p.addons && p.addons[a.slug] != null) ? p.addons[a.slug] : a.price])),
    }
  }

  const startEditSeason = (season) => {
    setEditingSeason({ id: season.id, start_date: season.start_date || '', end_date: season.end_date || '', prices: seasonPriceDefaults(season) })
  }

  const saveSeason = async () => {
    if (!editingSeason) return
    if (!editingSeason.start_date || !editingSeason.end_date) { alert('Ange start- och slutdatum.'); return }
    try {
      const p = editingSeason.prices
      const prices = {
        price_per_person_per_night: parseInt(p.price_per_person_per_night) || 0,
        min_price_per_night: parseInt(p.min_price_per_night) || 0,
        lillstuga_min_price_per_night: parseInt(p.lillstuga_min_price_per_night) || 0,
        deposit_amount: parseInt(p.deposit_amount) || 0,
        lillstuga_cleaning_price: parseInt(p.lillstuga_cleaning_price) || 0,
        addons: Object.fromEntries(Object.entries(p.addons || {}).map(([k, v]) => [k, parseInt(v) || 0])),
      }
      await api.updateSeason(editingSeason.id, { start_date: editingSeason.start_date, end_date: editingSeason.end_date, prices })
      setEditingSeason(null)
      loadData()
    } catch (err) {
      alert('Kunde inte spara säsong: ' + err.message)
    }
  }

  const fmtKr = (n) => new Intl.NumberFormat('sv-SE').format(n) + ' kr'
  const addonName = (a) => a.translations?.sv?.name || a.translations?.en?.name || a.slug

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
                onClick={() => (editingSeason?.id === season.id ? setEditingSeason(null) : startEditSeason(season))}
              >
                {editingSeason?.id === season.id ? 'Stäng' : 'Redigera'}
              </button>
              <button
                className="admin-btn admin-btn-secondary admin-btn-xs"
                onClick={() => handleToggleActive(season)}
              >
                {season.is_active ? 'Inaktivera' : 'Aktivera'}
              </button>
            </div>
          </div>

          {/* ---- Säsongspriser (datum + priser per säsong) ---- */}
          {editingSeason?.id === season.id ? (
            <div className="detail-card" style={{ margin: '0.75rem 0' }}>
              <h4 style={{ marginTop: 0 }}>Redigera säsong &amp; priser</h4>
              <div className="detail-row" style={{ alignItems: 'center' }}><span>Startdatum</span><input type="date" value={editingSeason.start_date} onChange={e => setEditingSeason(s => ({ ...s, start_date: e.target.value }))} /></div>
              <div className="detail-row" style={{ alignItems: 'center' }}><span>Slutdatum</span><input type="date" value={editingSeason.end_date} onChange={e => setEditingSeason(s => ({ ...s, end_date: e.target.value }))} /></div>
              <h5 style={{ margin: '0.75rem 0 0.25rem' }}>Lodge &amp; deposition</h5>
              {[
                ['price_per_person_per_night', 'Pris per person/natt'],
                ['min_price_per_night', 'Minpris/natt – hela lodgen'],
                ['lillstuga_min_price_per_night', 'Minpris/natt – Lillstugan'],
                ['deposit_amount', 'Deposition'],
                ['lillstuga_cleaning_price', 'Städning (endast Lillstugan)'],
              ].map(([key, label]) => (
                <div className="detail-row" style={{ alignItems: 'center' }} key={key}>
                  <span>{label} (SEK)</span>
                  <input type="number" min="0" step="50" value={editingSeason.prices[key]} style={{ width: '120px', textAlign: 'right' }}
                    onChange={e => setEditingSeason(s => ({ ...s, prices: { ...s.prices, [key]: e.target.value } }))} />
                </div>
              ))}
              <h5 style={{ margin: '0.75rem 0 0.25rem' }}>Tillval</h5>
              {addons.map(a => (
                <div className="detail-row" style={{ alignItems: 'center' }} key={a.slug}>
                  <span>{addonName(a)} (SEK)</span>
                  <input type="number" min="0" step="50" value={editingSeason.prices.addons[a.slug] ?? ''} style={{ width: '120px', textAlign: 'right' }}
                    onChange={e => setEditingSeason(s => ({ ...s, prices: { ...s.prices, addons: { ...s.prices.addons, [a.slug]: e.target.value } } }))} />
                </div>
              ))}
              <div className="action-btns" style={{ marginTop: '0.75rem' }}>
                <button className="admin-btn admin-btn-confirm admin-btn-sm" onClick={saveSeason}>Spara</button>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingSeason(null)}>Avbryt</button>
              </div>
            </div>
          ) : (
            (() => {
              const d = seasonPriceDefaults(season)
              const isDefault = !season.prices || Object.keys(season.prices).length === 0
              return (
                <div style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.9rem', color: 'var(--admin-text-muted)' }}>
                  <strong style={{ color: 'inherit' }}>Säsongspriser{isDefault ? ' (globala – ej satta för säsongen)' : ''}:</strong>{' '}
                  {fmtKr(d.price_per_person_per_night)}/pers · lodge från {fmtKr(d.min_price_per_night)} · Lillstugan från {fmtKr(d.lillstuga_min_price_per_night)} · deposition {fmtKr(d.deposit_amount)}
                </div>
              )
            })()
          )}

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
