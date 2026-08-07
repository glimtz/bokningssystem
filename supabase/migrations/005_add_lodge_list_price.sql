-- 005_add_lodge_list_price.sql
-- Sparar det ordinarie (oreducerade) lodge-priset på en bokning när admin lägger
-- ett specialpris/rabatt. Då kan bokningens Priser-vy och utskrift visa exakt
-- vilken rabatt gästen fått (ordinarie − faktiskt lodge-pris).
--
-- NULL = inget specialpris/ingen rabatt.
--
-- Kör i Supabase SQL Editor. Idempotent — säker att köra om.

alter table bookings
  add column if not exists lodge_list_price integer;

comment on column bookings.lodge_list_price is
  'Ordinarie (oreducerat) lodge-pris när specialpris/rabatt använts. NULL = inget specialpris. Rabatt = lodge_list_price - lodge_total.';
