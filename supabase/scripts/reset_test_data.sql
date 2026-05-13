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
select 'bookings'       as table_name, count(*) as rows from bookings
union all select 'booking_addons', count(*) from booking_addons
union all select 'payments',       count(*) from payments
union all select 'email_log',      count(*) from email_log
union all select 'guests',         count(*) from guests
union all select 'blocked_dates',  count(*) from blocked_dates
union all select 'addons (kvar)',  count(*) from addons
union all select 'seasons (kvar)', count(*) from seasons
union all select 'settings (kvar)',count(*) from settings;

-- Efter körning ska alla "transaktions"-tabeller vara 0
-- och de "statiska" (addons, seasons, settings) ha kvar sitt innehåll.
