-- 006_add_guest_id_number.sql
-- Frivilligt fält för organisationsnummer eller personnummer på gästen,
-- främst för fakturering. Fylls i från admin (Ny bokning + gästredigering).
--
-- OBS: personnummer är känslig personuppgift — hantera enligt GDPR
-- (samma som övriga gästuppgifter, RLS skyddar redan tabellen).
--
-- Kör i Supabase SQL Editor. Idempotent — säker att köra om.

alter table guests
  add column if not exists id_number text;

comment on column guests.id_number is
  'Organisationsnummer eller personnummer för fakturering. Frivilligt. Känslig PII — hantera enligt GDPR.';
