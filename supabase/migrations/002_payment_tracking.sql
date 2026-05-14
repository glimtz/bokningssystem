-- ============================================================
-- Migration 002 — Payment Tracking
-- Flightmode Adventures AB — Vilhelmina Lodge
-- ============================================================
--
-- Lägger till spårning för de tre betalningar som regleras i
-- bokningsavtalet (se Vilhelmina Lodge Bokningsavtal-Mall):
--   • Bokningsavgift  — 50% av totalbeloppet, krävs för bekräftelse
--   • Slutbetalning   — 50% av totalbeloppet, senast 30 dagar före ankomst
--   • Säkerhetsdeposition — 5 000 kr (standard), återbetalas efter avsyning
--
-- Belopp för bokningsavgift och slutbetalning beräknas dynamiskt
-- i applikationen som total_price * 0.5. Säkerhetsdepositionen ligger
-- redan i bookings.deposit_amount.
-- ============================================================

alter table bookings
  add column if not exists advance_paid_at      timestamptz,
  add column if not exists final_paid_at        timestamptz,
  add column if not exists deposit_paid_at      timestamptz,
  add column if not exists deposit_refunded_at  timestamptz;

comment on column bookings.advance_paid_at     is 'När bokningsavgift (50%) togs emot — krävs för bekräftelse';
comment on column bookings.final_paid_at       is 'När slutbetalning (50%) togs emot';
comment on column bookings.deposit_paid_at     is 'När säkerhetsdeposition (5000 kr) togs emot';
comment on column bookings.deposit_refunded_at is 'När säkerhetsdeposition återbetalades efter godkänd avsyning';
