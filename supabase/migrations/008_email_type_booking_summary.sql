-- ============================================================
-- 008 — Nytt värde i email_type: booking_summary
-- ============================================================
-- Används när admin mejlar bokningssammanställningen (utskriftsvyn) från
-- bokningsvyn, t.ex. till ekonomen. Loggas i email_log som alla andra mail.
--
-- OBS: alter type ... add value kan inte köras inuti en transaktion i äldre
-- Postgres. Kör satsen ensam i Supabase SQL Editor om den klagar.

alter type email_type add value if not exists 'booking_summary';
