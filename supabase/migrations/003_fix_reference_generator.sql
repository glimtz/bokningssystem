-- ============================================================
-- Migration 003 — Fix booking reference generator
-- ============================================================
--
-- Problem: Den ursprungliga generate_booking_reference-funktionen
-- räknade count(*) + 1 för att hitta nästa nummer. Det orsakade
-- krockar mot UNIQUE-constraint när en bokning togs bort, eftersom
-- count(*) sjönk men de gamla numren fanns kvar i andra rader.
--
-- Exempel: VL-2026-001..004 finns. -002 raderas. count(*) = 3.
-- Nästa nya bokning får trigger-genererad ref = VL-2026-004,
-- vilket krockar med den befintliga -004.
--
-- Fix: använd MAX av befintliga suffix för året i stället.
-- Det "fyller inte luckor" men garanterar unik referens.
-- ============================================================

create or replace function generate_booking_reference()
returns trigger as $$
declare
  year_str text;
  max_seq integer;
begin
  year_str := to_char(new.check_in, 'YYYY');

  select coalesce(max(
    substring(reference from ('^VL-' || year_str || '-([0-9]+)$'))::integer
  ), 0) into max_seq
  from bookings
  where reference like ('VL-' || year_str || '-%');

  new.reference := 'VL-' || year_str || '-' || lpad((max_seq + 1)::text, 3, '0');
  return new;
end;
$$ language plpgsql;

-- Trigger oförändrad — den pekar fortfarande på samma funktion
-- och behöver inte återskapas eftersom CREATE OR REPLACE FUNCTION
-- uppdaterar funktionsdefinitionen in-place.

comment on function generate_booking_reference() is
  'Genererar VL-YYYY-NNN-referens baserat på MAX(suffix) för året, inte COUNT. Robust mot borttagna bokningar.';
