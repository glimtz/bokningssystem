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

// Justera priset på en bokning. Uppdaterar total_price och/eller deposit_amount.
// Betalningarna (bokningsavgift/slutbetalning) räknas ut dynamiskt som
// total_price * 0.5 i UI:t, så de följer automatiskt med det nya priset —
// ingen separat uppdatering av betalningsrader behövs.
//
// Om `reason` anges loggas ändringen som en rad i admin_notes med datum och
// gamla → nya belopp, så prisjusteringar blir spårbara utan schemaändring.
export async function updateBookingPrice(id, { total_price, deposit_amount, reason }) {
  const { data: current, error: fetchError } = await supabase
    .from('bookings')
    .select('total_price, deposit_amount, admin_notes')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const update = {}
  if (total_price != null) update.total_price = total_price
  if (deposit_amount != null) update.deposit_amount = deposit_amount

  if (reason && reason.trim()) {
    const stamp = new Date().toLocaleDateString('sv-SE')
    const parts = []
    if (total_price != null && total_price !== current.total_price) {
      parts.push(`totalpris ${current.total_price} → ${total_price} kr`)
    }
    if (deposit_amount != null && deposit_amount !== current.deposit_amount) {
      parts.push(`deposition ${current.deposit_amount} → ${deposit_amount} kr`)
    }
    const changeText = parts.length ? ` (${parts.join(', ')})` : ''
    const logLine = `[${stamp}] Pris justerat${changeText}: ${reason.trim()}`
    update.admin_notes = current.admin_notes ? `${current.admin_notes}\n${logLine}` : logLine
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
// BOOKING EDITING — Gäst, detaljer, tillval, skapa bokning
// ============================================================

// Prishjälpare (speglar logiken i det publika flödet, BookingApp.jsx).
// Lodge-pris/natt = max(pris_per_person × antal_gäster, min_pris).
export function lodgePricePerNight(numGuests, settings) {
  const perPerson = parseInt(settings?.price_per_person_per_night) || 950
  const minPrice = parseInt(settings?.min_price_per_night) || 4000
  return Math.max(perPerson * (numGuests || 1), minPrice)
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
}

// Radtotal för ett tillval utifrån dess price_type.
// per_day → pris × antal dagar; per_person → pris × antal gäster; flat → pris.
// Accepterar både addons-rader (fält `price`) och booking_addons-rader (fält `unit_price`).
export function addonRowTotal(addon, { quantity, numGuests }) {
  const price = addon.unit_price != null ? addon.unit_price : addon.price
  if (addon.price_type === 'per_person') return price * (numGuests || 1)
  if (addon.price_type === 'flat') return price
  return price * (quantity || 1) // per_day (default)
}

// Uppdatera gästuppgifter (guests-raden kopplad till bokningen).
export async function updateGuest(guestId, fields) {
  const update = {}
  for (const k of ['name', 'email', 'phone', 'language', 'marketing_consent']) {
    if (k in fields) update[k] = fields[k]
  }
  const { data, error } = await supabase
    .from('guests').update(update).eq('id', guestId).select().single()
  if (error) throw error
  return data
}

// Uppdatera bokningsdetaljer (datum + antal gäster). Om `pricing` anges
// (t.ex. omräknat lodge/total) skrivs även de prisfälten i samma anrop.
export async function updateBookingDetails(id, { check_in, check_out, num_guests, pricing } = {}) {
  const update = {}
  if (check_in != null) update.check_in = check_in
  if (check_out != null) update.check_out = check_out
  if (num_guests != null) update.num_guests = num_guests
  if (pricing) {
    if (pricing.lodge_total != null) update.lodge_total = pricing.lodge_total
    if (pricing.addons_total != null) update.addons_total = pricing.addons_total
    if (pricing.total_price != null) update.total_price = pricing.total_price
  }
  const { data, error } = await supabase
    .from('bookings').update(update).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Räkna om addons_total + total_price från aktuella booking_addons och lodge_total.
export async function recalcBookingTotal(bookingId) {
  const { data: b, error: be } = await supabase
    .from('bookings').select('lodge_total').eq('id', bookingId).single()
  if (be) throw be
  const { data: rows, error: re } = await supabase
    .from('booking_addons').select('total_price').eq('booking_id', bookingId)
  if (re) throw re
  const addons_total = (rows || []).reduce((s, r) => s + (r.total_price || 0), 0)
  const total_price = (b.lodge_total || 0) + addons_total
  const { data, error } = await supabase
    .from('bookings').update({ addons_total, total_price }).eq('id', bookingId).select().single()
  if (error) throw error
  return data
}

// Lägg till ett tillval på en bokning. Räknar om bokningens total efteråt.
export async function addBookingAddon(bookingId, { addon_id, quantity, unit_price, total_price, selected_dates }) {
  const { error } = await supabase.from('booking_addons').insert({
    booking_id: bookingId,
    addon_id,
    quantity,
    unit_price,
    total_price,
    selected_dates: selected_dates && selected_dates.length ? selected_dates : null,
  })
  if (error) throw error
  return recalcBookingTotal(bookingId)
}

// Uppdatera ett befintligt tillval (antal, pris, valda dagar). Räknar om total.
export async function updateBookingAddon(bookingAddonId, bookingId, fields) {
  const update = {}
  for (const k of ['quantity', 'unit_price', 'total_price', 'selected_dates']) {
    if (k in fields) {
      update[k] = k === 'selected_dates'
        ? (fields[k] && fields[k].length ? fields[k] : null)
        : fields[k]
    }
  }
  const { error } = await supabase.from('booking_addons').update(update).eq('id', bookingAddonId)
  if (error) throw error
  return recalcBookingTotal(bookingId)
}

// Ta bort ett tillval. Räknar om total.
export async function deleteBookingAddon(bookingAddonId, bookingId) {
  const { error } = await supabase.from('booking_addons').delete().eq('id', bookingAddonId)
  if (error) throw error
  return recalcBookingTotal(bookingId)
}

// Skapa en bokning direkt i admin (t.ex. telefon-/mejlbokning).
// Skapar guest + booking + booking_addons. Status kan sättas fritt.
// OBS: INSERT på bookings triggar mail-webhooken (booking_received) — när
// mailen är påslagna (EMAILS_ENABLED) får gästen alltså ett mottagningsmail.
export async function createBooking({ guest, booking, addons, pricing }) {
  const { data: guestData, error: guestError } = await supabase
    .from('guests').insert({
      name: guest.name,
      email: guest.email,
      phone: guest.phone || null,
      language: guest.language || 'sv',
      gdpr_consent: true,
      gdpr_consent_at: new Date().toISOString(),
      marketing_consent: guest.marketing_consent || false,
    }).select().single()
  if (guestError) throw guestError

  const ts = {}
  const nowIso = new Date().toISOString()
  if (booking.status === 'confirmed') ts.confirmed_at = nowIso
  if (booking.status === 'paid') { ts.confirmed_at = nowIso; ts.paid_at = nowIso }
  if (booking.status === 'completed') { ts.confirmed_at = nowIso; ts.paid_at = nowIso }

  // Tvinga prisfälten till giltiga heltal — NaN/undefined blir 0, aldrig null.
  const num = (v) => (Number.isFinite(v) ? Math.round(v) : 0)

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings').insert({
      guest_id: guestData.id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      num_guests: booking.num_guests,
      message: booking.message || null,
      admin_notes: booking.admin_notes || null,
      status: booking.status || 'confirmed',
      lodge_total: num(pricing.lodge_total),
      addons_total: num(pricing.addons_total),
      total_price: num(pricing.total_price),
      deposit_amount: num(pricing.deposit_amount) || 5000,
      ...ts,
    }).select().single()
  if (bookingError) throw bookingError

  if (addons && addons.length > 0) {
    const rows = addons.map(a => ({
      booking_id: bookingData.id,
      addon_id: a.addon_id,
      quantity: a.quantity,
      unit_price: a.unit_price,
      total_price: a.total_price,
      selected_dates: a.selected_dates && a.selected_dates.length ? a.selected_dates : null,
    }))
    const { error: addonsError } = await supabase.from('booking_addons').insert(rows)
    if (addonsError) throw addonsError
  }

  return { id: bookingData.id, reference: bookingData.reference }
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
