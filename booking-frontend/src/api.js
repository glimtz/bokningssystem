import { supabase } from './supabaseClient'

// ============================================================
// PUBLIC QUERIES — Tillgänglighet och priser (anon access)
// ============================================================

/**
 * Hämta aktiv säsong med prisperioder
 */
export async function getActiveSeason() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*, pricing_periods(*)')
    .eq('is_active', true)
    .order('start_date', { ascending: true })
    .limit(1)
    .single()

  if (error) throw error
  return data
}

/**
 * Hämta alla blockerade datum
 */
export async function getBlockedDates() {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('date, reason')

  if (error) throw error
  return data.map(d => d.date)
}

/**
 * Hämta alla aktiva tillval med översättningar
 */
export async function getAddons() {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Hämta inställningar (deposit, max gäster etc.)
 */
export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error) throw error
  // Konvertera array till objekt: { deposit_amount: 5000, ... }
  return Object.fromEntries(data.map(s => [s.key, s.value]))
}

/**
 * Hämta bekräftade bokningar (datum) för kalendervisning
 * Returnerar bara check_in/check_out för att visa upptagna datum
 */
export async function getBookedDates() {
  const { data, error } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .in('status', ['confirmed', 'paid', 'pending'])

  if (error) throw error
  return data
}

// ============================================================
// BOOKING CREATION — Skapa bokning (anon insert)
// ============================================================

/**
 * Skapa en ny bokningsförfrågan
 *
 * @param {Object} params
 * @param {Object} params.guest - { name, email, phone, language, gdpr_consent, marketing_consent }
 * @param {Object} params.booking - { check_in, check_out, num_guests, message }
 * @param {Array} params.addons - [{ addon_id, quantity, unit_price, total_price, selected_dates }]
 * @param {Object} params.pricing - { lodge_total, addons_total, total_price, deposit_amount }
 */
export async function createBookingRequest({ guest, booking, addons, pricing }) {
  // 1. Skapa eller hitta gäst
  const { data: guestData, error: guestError } = await supabase
    .from('guests')
    .insert({
      name: guest.name,
      email: guest.email,
      phone: guest.phone || null,
      language: guest.language || 'en',
      gdpr_consent: guest.gdpr_consent,
      gdpr_consent_at: guest.gdpr_consent ? new Date().toISOString() : null,
      marketing_consent: guest.marketing_consent || false,
    })
    .select()
    .single()

  if (guestError) throw guestError

  // 2. Skapa bokning
  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      guest_id: guestData.id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      num_guests: booking.num_guests,
      message: booking.message || null,
      status: 'pending',
      lodge_total: pricing.lodge_total,
      addons_total: pricing.addons_total,
      total_price: pricing.total_price,
      deposit_amount: pricing.deposit_amount,
    })
    .select()
    .single()

  if (bookingError) throw bookingError

  // 3. Lägg till tillval
  if (addons && addons.length > 0) {
    const bookingAddons = addons.map(addon => ({
      booking_id: bookingData.id,
      addon_id: addon.addon_id,
      quantity: addon.quantity,
      unit_price: addon.unit_price,
      total_price: addon.total_price,
      selected_dates: addon.selected_dates || null,
    }))

    const { error: addonsError } = await supabase
      .from('booking_addons')
      .insert(bookingAddons)

    if (addonsError) throw addonsError
  }

  return {
    reference: bookingData.reference,
    secret_token: bookingData.secret_token,
    booking_id: bookingData.id,
  }
}

// ============================================================
// GUEST BOOKING LOOKUP — Gäst ser sin bokning via token
// ============================================================

/**
 * Hämta bokning via secret token (gästens vy)
 */
export async function getBookingByToken(token) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      guests(*),
      booking_addons(*, addons(*)),
      payments(*)
    `)
    .eq('secret_token', token)
    .single()

  if (error) throw error
  return data
}
