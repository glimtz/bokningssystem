-- 007_season_prices.sql
-- Pris per säsong: lodge (per person + golv), Lillstugans golv, städning för Lillstugan,
-- deposition och samtliga tillval. Lagras som JSONB på seasons.prices.
--
-- Backfillar varje befintlig säsong med dagens globala värden (från settings/addons)
-- så inget ändras för redan öppna datum. Nya säsonger sätter priser via admin.
--
-- Kör i Supabase SQL Editor. Idempotent: kolumnen läggs bara om den saknas, och
-- backfill körs bara på säsonger vars prices fortfarande är tomt ('{}').

alter table seasons
  add column if not exists prices jsonb not null default '{}';

comment on column seasons.prices is
  'Priser per säsong (JSONB): price_per_person_per_night, min_price_per_night, lillstuga_min_price_per_night, lillstuga_cleaning_price, deposit_amount, samt addons{slug:pris}. Tomt {} = använd globala fallback (settings/addons).';

-- Backfill: (value #>> ''{}'') hämtar jsonb-skalären som ren text oavsett om den
-- lagrats som tal (5000) eller sträng ("5000"), så cast:en till int alltid funkar.
update seasons s set prices = jsonb_build_object(
  'price_per_person_per_night',    coalesce((select (value #>> '{}')::int from settings where key = 'price_per_person_per_night'), 950),
  'min_price_per_night',           coalesce((select (value #>> '{}')::int from settings where key = 'min_price_per_night'), 4000),
  'lillstuga_min_price_per_night', coalesce((select (value #>> '{}')::int from settings where key = 'lillstuga_min_price_per_night'), 2000),
  'lillstuga_cleaning_price',      coalesce((select (value #>> '{}')::int from settings where key = 'lillstuga_cleaning_price'), 700),
  'deposit_amount',                coalesce((select (value #>> '{}')::int from settings where key = 'deposit_amount'), 5000),
  'addons',                        (select coalesce(jsonb_object_agg(slug, price), '{}'::jsonb) from addons)
)
where s.prices = '{}'::jsonb;
