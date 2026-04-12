-- ============================================================
-- Bokningssystem Vilhelmina Lodge — Initial Schema
-- Flightmode Adventures AB
-- Version: 1.0 | 2026-04-07
-- Target: Supabase (PostgreSQL 15+)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- SEASONS — Säsonger och öppettider
-- ============================================================
create table seasons (
  id            uuid primary key default uuid_generate_v4(),
  year          smallint not null,
  name          text not null,                    -- e.g. 'Sommar 2026'
  start_date    date not null,
  end_date      date not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint seasons_dates_check check (end_date > start_date),
  constraint seasons_year_unique unique (year, name)
);

comment on table seasons is 'Säsonger — definierar vilka perioder lodgen är öppen';

-- ============================================================
-- PRICING_PERIODS — Prissättning per period (hög/lågsäsong)
-- ============================================================
create table pricing_periods (
  id              uuid primary key default uuid_generate_v4(),
  season_id       uuid not null references seasons(id) on delete cascade,
  name            text not null,                  -- e.g. 'Högsäsong', 'Normalsäsong'
  start_date      date not null,
  end_date        date not null,
  price_per_night integer not null,               -- SEK, lodgepris per natt
  min_nights      smallint not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint pricing_dates_check check (end_date > start_date)
);

comment on table pricing_periods is 'Prisperioder inom en säsong — stöder högsäsong/lågsäsong';

-- ============================================================
-- BLOCKED_DATES — Blockerade datum (admin, Airbnb-synk etc.)
-- ============================================================
create table blocked_dates (
  id            uuid primary key default uuid_generate_v4(),
  date          date not null unique,
  reason        text,                             -- e.g. 'Airbnb-bokning', 'Underhåll'
  source        text not null default 'manual',   -- 'manual', 'airbnb', 'google'
  created_at    timestamptz not null default now()
);

comment on table blocked_dates is 'Datum då lodgen inte är tillgänglig';

-- ============================================================
-- ADDONS — Tillval (båt, guide, sänglinne, städ)
-- ============================================================
create table addons (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,             -- e.g. 'boat', 'guide', 'linens', 'cleaning'
  price         integer not null,                 -- SEK
  price_type    text not null,                    -- 'per_day', 'per_person', 'flat'
  is_active     boolean not null default true,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Translations stored as JSONB: { "en": { "name": "...", "description": "..." }, "sv": {...} }
  translations  jsonb not null default '{}'
);

comment on table addons is 'Tillval som gästen kan välja — pris och flerspråkig info';

-- ============================================================
-- GUESTS — Gästregister
-- ============================================================
create table guests (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text not null,
  phone         text,
  language      text not null default 'en',       -- 'en', 'sv', 'de', 'fr'
  notes         text,                             -- Admin-anteckningar
  gdpr_consent  boolean not null default false,   -- GDPR: samtycke till databehandling
  gdpr_consent_at timestamptz,                    -- När samtycke gavs
  marketing_consent boolean not null default false, -- Samtycke till marknadsföring
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table guests is 'Gästregister — kontaktuppgifter och historik';

-- Index for looking up returning guests
create index idx_guests_email on guests(email);

-- ============================================================
-- BOOKINGS — Bokningar (kärntabellen)
-- ============================================================
create type booking_status as enum (
  'pending',      -- Förfrågan inskickad, väntar på admin
  'confirmed',    -- Admin har godkänt, väntar på deposition
  'paid',         -- Deposition betald
  'cancelled',    -- Avbokad
  'declined',     -- Admin nekade förfrågan
  'completed'     -- Vistelsen genomförd
);

create table bookings (
  id              uuid primary key default uuid_generate_v4(),
  reference       text not null unique,           -- Human-readable ref, e.g. 'VL-2026-001'
  guest_id        uuid not null references guests(id),
  check_in        date not null,
  check_out       date not null,
  num_guests      smallint not null,
  status          booking_status not null default 'pending',
  secret_token    text not null default encode(gen_random_bytes(16), 'hex'),  -- Unik länk för gästen
  message         text,                           -- Gästens meddelande/önskemål
  admin_notes     text,                           -- Interna anteckningar

  -- Prissummering (sparas vid bokningstilfället)
  lodge_total     integer not null default 0,     -- SEK
  addons_total    integer not null default 0,     -- SEK
  total_price     integer not null default 0,     -- SEK
  deposit_amount  integer not null default 0,     -- SEK

  -- Tidsstämplar för statusändringar
  confirmed_at    timestamptz,
  paid_at         timestamptz,
  cancelled_at    timestamptz,
  declined_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint bookings_dates_check check (check_out > check_in),
  constraint bookings_guests_check check (num_guests between 1 and 8)
);

comment on table bookings is 'Bokningar — från förfrågan till genomförd vistelse';

-- Index for calendar queries
create index idx_bookings_dates on bookings(check_in, check_out);
create index idx_bookings_status on bookings(status);

-- ============================================================
-- BOOKING_ADDONS — Tillval kopplade till en bokning
-- ============================================================
create table booking_addons (
  id              uuid primary key default uuid_generate_v4(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  addon_id        uuid not null references addons(id),
  quantity        smallint not null default 1,     -- Antal dagar/personer beroende på price_type
  unit_price      integer not null,                -- Pris vid bokningstillfället
  total_price     integer not null,                -- quantity * unit_price
  selected_dates  date[],                          -- Specifika datum (för guide-bokning)
  created_at      timestamptz not null default now()
);

comment on table booking_addons is 'Tillval kopplade till en specifik bokning';

-- ============================================================
-- PAYMENTS — Betalningar (Stripe, Swish)
-- ============================================================
create type payment_method as enum ('stripe', 'swish', 'manual');
create type payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type payment_type as enum ('deposit', 'final', 'full');

create table payments (
  id                  uuid primary key default uuid_generate_v4(),
  booking_id          uuid not null references bookings(id) on delete cascade,
  amount              integer not null,            -- SEK
  method              payment_method not null,
  status              payment_status not null default 'pending',
  type                payment_type not null,       -- 'deposit' eller 'final'

  -- Stripe-specifikt
  stripe_payment_id   text,
  stripe_checkout_url text,

  -- Swish-specifikt (fas 2)
  swish_payment_id    text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table payments is 'Betalningar — spårar deposition och slutbetalning';

-- ============================================================
-- EMAIL_LOG — Logg över skickade e-postmeddelanden
-- ============================================================
create type email_type as enum (
  'booking_received',     -- Bekräftelse att förfrågan mottogs
  'booking_confirmed',    -- Admin har godkänt
  'booking_declined',     -- Admin nekade
  'payment_request',      -- Depositionslänk
  'payment_confirmed',    -- Betalning mottagen
  'reminder',             -- Påminnelse före vistelse
  'welcome',              -- Välkomstinfo
  'cancellation'          -- Avbokningsbekräftelse
);

create table email_log (
  id            uuid primary key default uuid_generate_v4(),
  booking_id    uuid references bookings(id) on delete set null,
  guest_id      uuid references guests(id) on delete set null,
  email_type    email_type not null,
  recipient     text not null,
  subject       text not null,
  sent_at       timestamptz not null default now(),
  status        text not null default 'sent'      -- 'sent', 'failed', 'bounced'
);

comment on table email_log is 'Logg över all e-postkommunikation med gäster';

-- ============================================================
-- SETTINGS — Systeminställningar (nyckel-värde)
-- ============================================================
create table settings (
  key           text primary key,
  value         jsonb not null,
  updated_at    timestamptz not null default now()
);

comment on table settings is 'Globala inställningar — deposit, max gäster, kontaktinfo etc.';

-- Sätt standardvärden
insert into settings (key, value) values
  ('deposit_amount', '5000'),
  ('max_guests', '8'),
  ('currency', '"SEK"'),
  ('lodge_name', '"Vilhelmina Lodge"'),
  ('contact_email', '"info@flightmode.se"'),
  ('supported_languages', '["en", "sv", "de", "fr"]'),
  ('booking_auto_decline_hours', '72');

-- ============================================================
-- FUNCTIONS — Auto-uppdatera updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Applicera trigger på alla tabeller med updated_at
create trigger set_updated_at before update on seasons
  for each row execute function update_updated_at();

create trigger set_updated_at before update on pricing_periods
  for each row execute function update_updated_at();

create trigger set_updated_at before update on addons
  for each row execute function update_updated_at();

create trigger set_updated_at before update on guests
  for each row execute function update_updated_at();

create trigger set_updated_at before update on bookings
  for each row execute function update_updated_at();

create trigger set_updated_at before update on payments
  for each row execute function update_updated_at();

create trigger set_updated_at before update on settings
  for each row execute function update_updated_at();

-- ============================================================
-- FUNCTION — Generera bokningsreferens
-- ============================================================
create or replace function generate_booking_reference()
returns trigger as $$
declare
  year_str text;
  seq_num integer;
begin
  year_str := to_char(new.check_in, 'YYYY');
  select count(*) + 1 into seq_num
    from bookings
    where extract(year from check_in) = extract(year from new.check_in);
  new.reference := 'VL-' || year_str || '-' || lpad(seq_num::text, 3, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_booking_reference before insert on bookings
  for each row when (new.reference is null)
  execute function generate_booking_reference();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Aktivera RLS på alla tabeller
alter table seasons enable row level security;
alter table pricing_periods enable row level security;
alter table blocked_dates enable row level security;
alter table addons enable row level security;
alter table guests enable row level security;
alter table bookings enable row level security;
alter table booking_addons enable row level security;
alter table payments enable row level security;
alter table email_log enable row level security;
alter table settings enable row level security;

-- Publika policies (gästens vy — anon)
create policy "Seasons are viewable by everyone"
  on seasons for select using (is_active = true);

create policy "Active pricing periods are viewable by everyone"
  on pricing_periods for select using (true);

create policy "Blocked dates are viewable by everyone"
  on blocked_dates for select using (true);

create policy "Active addons are viewable by everyone"
  on addons for select using (is_active = true);

create policy "Settings are viewable by everyone"
  on settings for select using (true);

-- Gäster kan skapa bokningar (anon insert)
create policy "Anyone can create a guest record"
  on guests for insert with check (true);

create policy "Anyone can create a booking"
  on bookings for insert with check (true);

create policy "Anyone can add booking addons"
  on booking_addons for insert with check (true);

-- Gäster kan se sin egen bokning via secret_token (skickas i bekräftelsemejl)
create policy "Guests can view their own booking"
  on bookings for select using (
    secret_token = current_setting('request.headers', true)::json->>'x-booking-token'
    or auth.role() = 'authenticated'
  );

-- Admin-policies (authenticated users)
create policy "Admins have full access to seasons"
  on seasons for all using (auth.role() = 'authenticated');

create policy "Admins have full access to pricing_periods"
  on pricing_periods for all using (auth.role() = 'authenticated');

create policy "Admins have full access to blocked_dates"
  on blocked_dates for all using (auth.role() = 'authenticated');

create policy "Admins have full access to addons"
  on addons for all using (auth.role() = 'authenticated');

create policy "Admins have full access to guests"
  on guests for all using (auth.role() = 'authenticated');

create policy "Admins have full access to bookings"
  on bookings for all using (auth.role() = 'authenticated');

create policy "Admins have full access to booking_addons"
  on booking_addons for all using (auth.role() = 'authenticated');

create policy "Admins have full access to payments"
  on payments for all using (auth.role() = 'authenticated');

create policy "Admins have full access to email_log"
  on email_log for all using (auth.role() = 'authenticated');

create policy "Admins have full access to settings"
  on settings for all using (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA — Tillval
-- ============================================================
insert into addons (slug, price, price_type, sort_order, translations) values
  ('boat', 1000, 'per_day', 1, '{
    "en": { "name": "Boat rental", "description": "Alloycraft J370 with 10 hp outboard motor. Trailer included." },
    "sv": { "name": "Båthyra", "description": "Alloycraft J370 med 10 hk utombordsmotor. Släpvagn ingår." },
    "de": { "name": "Bootsverleih", "description": "Alloycraft J370 mit 10-PS-Außenborder. Anhänger inklusive." },
    "fr": { "name": "Location de bateau", "description": "Alloycraft J370 avec moteur hors-bord 10 CV. Remorque incluse." }
  }'),
  ('guide', 8000, 'per_day', 2, '{
    "en": { "name": "Fishing guide", "description": "Full day with a private fishing guide. Lunch included." },
    "sv": { "name": "Fiskeguide", "description": "Heldag med privat fiskeguide. Lunch ingår." },
    "de": { "name": "Angelguide", "description": "Ganzer Tag mit privatem Angelguide. Mittagessen inklusive." },
    "fr": { "name": "Guide de pêche", "description": "Journée complète avec guide de pêche privé. Déjeuner inclus." }
  }'),
  ('linens', 200, 'per_person', 3, '{
    "en": { "name": "Bed linens & towels", "description": "Fresh bed linens and towels for each guest." },
    "sv": { "name": "Sänglinne & handdukar", "description": "Fräscht sänglinne och handdukar för varje gäst." },
    "de": { "name": "Bettwäsche & Handtücher", "description": "Frische Bettwäsche und Handtücher für jeden Gast." },
    "fr": { "name": "Linge de lit & serviettes", "description": "Linge de lit et serviettes frais pour chaque invité." }
  }'),
  ('cleaning', 2500, 'flat', 4, '{
    "en": { "name": "Final cleaning", "description": "Professional cleaning after your stay." },
    "sv": { "name": "Slutstädning", "description": "Professionell städning efter er vistelse." },
    "de": { "name": "Endreinigung", "description": "Professionelle Reinigung nach Ihrem Aufenthalt." },
    "fr": { "name": "Ménage final", "description": "Nettoyage professionnel après votre séjour." }
  }');
