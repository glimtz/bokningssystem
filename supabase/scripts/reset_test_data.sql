-- ============================================================
-- RESET TEST DATA — Tömmer bokningssystemet inför skarpt läge
-- Flightmode Adventures AB — Vilhelmina Lodge
-- ============================================================
--
-- VARNING: Detta raderar ALLA bokningar, gäster och mejlloggar.
-- Statisk data behålls: addons, seasons, pricing_periods, settings.
--
-- Hur du kör det:
--   1. Öppna Supabase Dashboard → SQL Editor
--   2. Klistra in hela filen
--   3. Klicka "Run" (eller markera och kör sektion för sektion)
--
-- Rekommendation: Ta en backup först via Database → Backups.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Steg 1: Töm transaktionsdata
-- ------------------------------------------------------------
-- TRUNCATE med CASCADE tar med booking_addons + payments automatiskt
-- (de har ON DELETE CASCADE mot bookings).
-- email_log och guests måste anges explicit.
-- RESTART IDENTITY nollställer eventuella sequences.

truncate table
  bookings,
  booking_addons,
  payments,
  email_log,
  guests
restart identity cascade;

-- ------------------------------------------------------------
-- Steg 2: (Valfritt) Töm blocked_dates
-- ------------------------------------------------------------
-- Avkommentera om du vill ta bort manuellt blockerade datum.
-- OBS: Behåll om du har lagt in riktiga Airbnb-bokningar eller
-- underhållsdagar som ska gälla i skarpt läge.

-- truncate table blocked_dates restart identity;

commit;

-- ------------------------------------------------------------
-- Verifiera resultatet
-- ------------------------------------------------------------
-- Subquery-form fungerar pålitligt i Supabase SQL Editor.
-- Efter körning ska bookings/booking_addons/payments/email_log/guests = 0
-- och addons/seasons/settings ha kvar sitt innehåll.

select
  (select count(*) from bookings)       as bookings,
  (select count(*) from booking_addons) as booking_addons,
  (select count(*) from payments)       as payments,
  (select count(*) from email_log)      as email_log,
  (select count(*) from guests)         as guests,
  (select count(*) from blocked_dates)  as blocked_dates,
  (select count(*) from addons)         as addons_kept,
  (select count(*) from seasons)        as seasons_kept,
  (select count(*) from settings)       as settings_kept;
