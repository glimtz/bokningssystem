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
