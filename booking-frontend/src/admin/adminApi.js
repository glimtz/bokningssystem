import { supabase } from '../supabaseClient'

// ============================================================
// AUTH — Admin login/logout
// ============================================================

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

// ============================================================
// BOOKINGS — Full admin access
// ============================================================

export async function getBookings({ status, search, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      guests(*),
      booking_addons(*, addons(*))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
  if (error) throw error

  // Client-side search filter (Supabase free tier doesn't support full-text on joins)
  if (search && search.trim()) {
    const term = search.toLowerCase()
    return {
      data: data.filter(b =>
        b.reference?.toLowerCase().includes(term) ||
        b.guests?.name?.toLowerCase().includes(term) ||
        b.guests?.email?.toLowerCase().includes(term)
      ),
      count
    }
  }

  return { data, count }
}

export async function getBookingById(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      guests(*),
      booking_addons(*, addons(*)),
      payments(*),
      email_log(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateBookingStatus(id, status) {
  const timestampField = {
    confirmed: 'confirmed_at',
    declined: 'declined_at',
    cancelled: 'cancelled_at',
    paid: 'paid_at',
  }

  const update = { status }
  if (timestampField[status]) {
    update[timestampField[status]] = new Date().toISOString()
  }

  // Vid återställning till pending: rensa declined_at och cancelled_at
  // så bokningen ser "fräsch" ut igen. confirmed_at och paid_at lämnas
  // intakta (de speglar betalningshistorik och kan vara relevanta).
  if (status === 'pending') {
    update.declined_at = null
    update.cancelled_at = null
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBookingNotes(id, admin_notes) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ admin_notes })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Registrera eller ångra en betalning på en bokning.
// type:   'advance' | 'final' | 'deposit_paid' | 'deposit_refunded'
// paidAt: ISO-timestamp (sätt till null för att ångra)
//
// Automatiska statusändringar när paidAt sätts:
//   • advance → status går från 'pending'   till 'confirmed'
//   • final   → status går från 'confirmed' till 'paid'
// Säkerhetsdepositionen påverkar inte bokningens huvudstatus.
export async function setBookingPayment(id, type, paidAt) {
  const columnMap = {
    advance: 'advance_paid_at',
    final: 'final_paid_at',
    deposit_paid: 'deposit_paid_at',
    deposit_refunded: 'deposit_refunded_at',
  }
  const col = columnMap[type]
  if (!col) throw new Error('Invalid payment type: ' + type)

  const { data: current, error: fetchError } = await supabase
    .from('bookings')
    .select('status, confirmed_at, paid_at')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const update = { [col]: paidAt }

  if (paidAt) {
    if (type === 'advance' && current.status === 'pending') {
      update.status = 'confirmed'
      update.confirmed_at = current.confirmed_at || new Date().toISOString()
    }
    if (type === 'final' && current.status === 'confirmed') {
      update.status = 'paid'
      update.paid_at = current.paid_at || new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Skicka status-mail till gästen via Edge Function send-booking-emails.
// eventType: 'booking_confirmed' | 'booking_declined'
//
// Mailet skickas asynkront. Returnerar { ok: true } vid lyckat utskick,
// eller { ok: false, error: '...' } om något gick fel. Vi kastar inte
// exceptions — admin-flödet ska inte avbrytas av ett mail-fel, men admin
// ska informeras så de kan följa upp manuellt.
export async function sendStatusEmail(bookingId, eventType) {
  try {
    const { data, error } = await supabase.functions.invoke('send-booking-emails', {
      body: { event_type: eventType, booking_id: bookingId },
    })
    if (error) return { ok: false, error: error.message || String(error) }
    if (data && data.error) return { ok: false, error: data.error }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
}

// Hard delete — tar bort bokningen permanent.
// booking_addons och payments raderas automatiskt via ON DELETE CASCADE.
// email_log behålls men får booking_id = NULL (ON DELETE SET NULL).
// Gästen i guests-tabellen lämnas orörd.
export async function deleteBooking(id) {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// SEASONS & PRICING
// ============================================================

export async function getSeasons() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*, pricing_periods(*)')
    .order('year', { ascending: false })

  if (error) throw error
  return data
}

export async function createSeason(season) {
  const { data, error } = await supabase
    .from('seasons')
    .insert(season)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSeason(id, updates) {
  const { data, error } = await supabase
    .from('seasons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createPricingPeriod(period) {
  const { data, error } = await supabase
    .from('pricing_periods')
    .insert(period)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePricingPeriod(id, updates) {
  const { data, error } = await supabase
    .from('pricing_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePricingPeriod(id) {
  const { error } = await supabase
    .from('pricing_periods')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// BLOCKED DATES
// ============================================================

export async function getBlockedDates() {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('date', { ascending: true })

  if (error) throw error
  return data
}

export async function addBlockedDate(date, reason, source = 'manual') {
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ date, reason, source })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeBlockedDate(id) {
  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// STATISTICS
// ============================================================

export async function getStats() {
  const [bookingsRes, guestsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, total_price, check_in, check_out, num_guests, created_at'),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true }),
  ])

  if (bookingsRes.error) throw bookingsRes.error
  if (guestsRes.error) throw guestsRes.error

  const bookings = bookingsRes.data
  const totalGuests = guestsRes.count

  const now = new Date()
  const currentYear = now.getFullYear()

  const byStatus = {}
  let totalRevenue = 0
  let totalNights = 0
  let thisYearBookings = 0

  bookings.forEach(b => {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1

    if (['confirmed', 'paid', 'completed'].includes(b.status)) {
      totalRevenue += b.total_price || 0
      const nights = Math.round(
        (new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24)
      )
      totalNights += nights
    }

    if (new Date(b.created_at).getFullYear() === currentYear) {
      thisYearBookings++
    }
  })

  return {
    totalBookings: bookings.length,
    thisYearBookings,
    byStatus,
    totalRevenue,
    totalNights,
    totalGuests,
    bookings, // raw data for charts
  }
}

// ============================================================
// ADDONS — Manage addon pricing
// ============================================================

export async function getAddons() {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function updateAddon(id, updates) {
  const { data, error } = await supabase
    .from('addons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// SETTINGS
// ============================================================

export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error) throw error
  return Object.fromEntries(data.map(s => [s.key, s.value]))
}

export async function updateSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) throw error
}
