-- 009_winter_season.sql
-- Vintersäsong (low season) + sommarsäsong (high season).
--
--   High / Sommar:  15 maj – 30 september   — hela lodgen ELLER Lillstugan
--   Low  / Vinter:  1 oktober – 14 maj      — ENDAST hela lodgen, minpris 2 000 kr/natt
--
-- Ingen schemaändring behövs: regeln "endast hela lodgen" lagras som
-- seasons.prices.lillstuga_available = false (JSONB, se 007). Saknas flaggan
-- räknas Lillstugan som bokningsbar, så befintliga säsonger påverkas inte.
--
-- Skriptet lägger bara in en säsong om inget befintligt datumintervall överlappar
-- (annars NOTICE + hoppar över). Priserna kopieras från globala settings/addons,
-- vintern får minpris 2 000 kr/natt för hela lodgen. Justera sedan i /admin/seasons.
--
-- Kör i Supabase SQL Editor. Idempotent — säkert att köra om.

do $$
declare
  base jsonb;
  r record;
begin
  base := jsonb_build_object(
    'price_per_person_per_night',    coalesce((select (value #>> '{}')::int from settings where key = 'price_per_person_per_night'), 950),
    'min_price_per_night',           coalesce((select (value #>> '{}')::int from settings where key = 'min_price_per_night'), 4000),
    'lillstuga_min_price_per_night', coalesce((select (value #>> '{}')::int from settings where key = 'lillstuga_min_price_per_night'), 2000),
    'lillstuga_cleaning_price',      coalesce((select (value #>> '{}')::int from settings where key = 'lillstuga_cleaning_price'), 700),
    'deposit_amount',                coalesce((select (value #>> '{}')::int from settings where key = 'deposit_amount'), 5000),
    'addons',                        (select coalesce(jsonb_object_agg(slug, price), '{}'::jsonb) from addons)
  );

  for r in
    select * from (values
      (2026::smallint, 'Vinter 2026/27', date '2026-10-01', date '2027-05-14', true),
      (2027::smallint, 'Sommar 2027',    date '2027-05-15', date '2027-09-30', false),
      (2027::smallint, 'Vinter 2027/28', date '2027-10-01', date '2028-05-14', true)
    ) as v(year, name, start_date, end_date, winter)
  loop
    if exists (select 1 from seasons s where s.start_date <= r.end_date and s.end_date >= r.start_date) then
      raise notice 'Hoppar över "%" (% – %): överlappar befintlig säsong. Justera datumen i /admin/seasons.', r.name, r.start_date, r.end_date;
    else
      insert into seasons (year, name, start_date, end_date, is_active, prices)
      values (
        r.year, r.name, r.start_date, r.end_date, true,
        case when r.winter
          then base || jsonb_build_object('min_price_per_night', 2000, 'lillstuga_available', false)
          else base || jsonb_build_object('lillstuga_available', true)
        end
      );
      raise notice 'Skapade "%" (% – %).', r.name, r.start_date, r.end_date;
    end if;
  end loop;
end $$;

-- Kontroll: alla säsonger efteråt
select name, start_date, end_date, is_active,
       prices->>'min_price_per_night' as lodge_minpris,
       coalesce(prices->>'lillstuga_available', 'true') as lillstuga_bokningsbar
from seasons order by start_date;
