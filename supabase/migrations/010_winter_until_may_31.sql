-- 010_winter_until_may_31.sql
-- Vintersäsongen förlängs till 31 maj, sommarsäsongen börjar 1 juni.
--
--   High / Sommar:  1 juni – 30 september   — hela lodgen ELLER Lillstugan
--   Low  / Vinter:  1 oktober – 31 maj      — ENDAST hela lodgen, minpris 2 000 kr/natt
--
-- Gäller alla säsonger som fortfarande har den gamla gränsen 14/15 maj
-- (t.ex. Vinter 2026/27, Sommar 2027, Vinter 2027/28). Priser rörs inte.
-- Befintliga bokningar påverkas inte: priset lagras per bokning.
--
-- Kör i Supabase SQL Editor. Idempotent — säkert att köra om.

-- 1) Sommarsäsonger som börjar 15 maj → börjar 1 juni (görs först så inget överlappar)
update seasons
set start_date = make_date(extract(year from start_date)::int, 6, 1)
where extract(month from start_date) = 5
  and extract(day from start_date) = 15;

-- 2) Vintersäsonger som slutar 14 maj → slutar 31 maj
update seasons
set end_date = make_date(extract(year from end_date)::int, 5, 31)
where extract(month from end_date) = 5
  and extract(day from end_date) = 14;

-- Kontroll: alla säsonger efteråt
select name, start_date, end_date, is_active,
       prices->>'min_price_per_night' as lodge_minpris,
       coalesce(prices->>'lillstuga_available', 'true') as lillstuga_bokningsbar
from seasons order by start_date;
