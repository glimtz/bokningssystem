-- 004_add_rental_option.sql
-- Nytt boendealternativ: hyra endast Lillstugan (sovstuga + delad relax/bastu
-- + grillkåta/utegrillplats), utan storstugan. Bokningen är fortfarande
-- exklusiv och blockerar hela fastigheten precis som en vanlig lodge-bokning.
--
-- Prismodell (samma per-person-pris som lodgen, lägre golv, färre gäster):
--   Lillstugan  = max(950 kr × antal gäster, 2 000 kr) per natt, max 4 gäster
--   Hela lodgen = max(950 kr × antal gäster, 4 000 kr) per natt, max 8 gäster
--
-- Kör i Supabase SQL Editor. Idempotent — säkert att köra om.

-- ============================================================
-- 1. Kolumn på bookings: vilket boende som bokats
-- ============================================================
alter table bookings
  add column if not exists rental_option text not null default 'full_lodge';

-- Begränsa till kända värden (skapa constraint bara om den saknas)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_rental_option_check'
  ) then
    alter table bookings
      add constraint bookings_rental_option_check
      check (rental_option in ('full_lodge', 'lillstuga'));
  end if;
end $$;

comment on column bookings.rental_option is
  'Vilket boende som bokats: full_lodge (hela lodgen) eller lillstuga (endast Lillstugan).';

-- ============================================================
-- 2. Inställningar för Lillstugan
-- ============================================================
insert into settings (key, value) values
  ('lillstuga_min_price_per_night', '2000'),
  ('lillstuga_max_guests', '4')
on conflict (key) do update set value = excluded.value;

-- ============================================================
-- 3. Gör lodgens grundvärden explicita i settings (om de saknas)
--    så att både lodge och lillstuga styrs från samma ställe.
--    price_per_person_per_night och min_price_per_night har hittills
--    bara funnits som kod-defaultar i frontend (950 / 4000).
-- ============================================================
insert into settings (key, value) values
  ('price_per_person_per_night', '950'),
  ('min_price_per_night', '4000')
on conflict (key) do nothing;
