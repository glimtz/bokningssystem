# Databasschema — Bokningssystem Vilhelmina Lodge

> Version 1.0 | 2026-04-07 | Supabase (PostgreSQL)

---

## ER-diagram

```mermaid
erDiagram
    SEASONS ||--o{ PRICING_PERIODS : "har"
    GUESTS ||--o{ BOOKINGS : "gör"
    BOOKINGS ||--o{ BOOKING_ADDONS : "inkluderar"
    BOOKINGS ||--o{ PAYMENTS : "betalas via"
    BOOKINGS ||--o{ EMAIL_LOG : "skickar"
    ADDONS ||--o{ BOOKING_ADDONS : "väljs i"
    GUESTS ||--o{ EMAIL_LOG : "mottar"

    SEASONS {
        uuid id PK
        smallint year
        text name
        date start_date
        date end_date
        boolean is_active
    }

    PRICING_PERIODS {
        uuid id PK
        uuid season_id FK
        text name
        date start_date
        date end_date
        integer price_per_night
        smallint min_nights
    }

    BLOCKED_DATES {
        uuid id PK
        date date UK
        text reason
        text source
    }

    ADDONS {
        uuid id PK
        text slug UK
        integer price
        text price_type
        boolean is_active
        jsonb translations
    }

    GUESTS {
        uuid id PK
        text name
        text email
        text phone
        text language
        text notes
        boolean gdpr_consent
        boolean marketing_consent
    }

    BOOKINGS {
        uuid id PK
        text reference UK
        text secret_token UK
        uuid guest_id FK
        date check_in
        date check_out
        smallint num_guests
        booking_status status
        integer total_price
        integer deposit_amount
    }

    BOOKING_ADDONS {
        uuid id PK
        uuid booking_id FK
        uuid addon_id FK
        smallint quantity
        integer unit_price
        integer total_price
    }

    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        integer amount
        payment_method method
        payment_status status
        payment_type type
        text stripe_payment_id
    }

    EMAIL_LOG {
        uuid id PK
        uuid booking_id FK
        uuid guest_id FK
        email_type email_type
        text recipient
        text subject
    }

    SETTINGS {
        text key PK
        jsonb value
    }
```

## Tabellöversikt

| Tabell | Syfte | Fas |
|--------|-------|-----|
| **seasons** | Definierar säsonger (maj–sep) med öppning/stängning | 1 |
| **pricing_periods** | Prissättning per period inom en säsong | 1 (enkel), 3 (avancerad) |
| **blocked_dates** | Blockerade datum — admin, Airbnb-synk, underhåll | 1 |
| **addons** | Tillval: båt, guide, sänglinne, städ | 1 |
| **guests** | Gästregister med kontaktuppgifter och språk | 1 |
| **bookings** | Alla bokningar — från förfrågan till genomförd | 1 |
| **booking_addons** | Kopplingstabell: vilka tillval en bokning inkluderar | 1 |
| **payments** | Betalningar via Stripe (fas 1) och Swish (fas 2) | 1 |
| **email_log** | Logg över all e-postkommunikation | 1 |
| **settings** | Globala inställningar (depositionsbelopp, max gäster etc.) | 1 |

## Bokningsflöde i databasen

```
1. Gäst fyller i formulär
   → INSERT guests (om ny gäst)
   → INSERT bookings (status: 'pending')
   → INSERT booking_addons (tillval)
   → INSERT email_log (booking_received)

2. Admin granskar och godkänner
   → UPDATE bookings (status: 'confirmed', confirmed_at)
   → INSERT email_log (booking_confirmed + payment_request)

3. Gäst betalar deposition
   → INSERT payments (method: 'stripe', type: 'deposit')
   → UPDATE bookings (status: 'paid', paid_at)
   → INSERT email_log (payment_confirmed)

4. Före vistelse
   → INSERT email_log (reminder + welcome)

5. Efter vistelse
   → UPDATE bookings (status: 'completed')
```

## Nyckelval

**Flerspråkighet i addons:** JSONB-fält med `{ "en": {...}, "sv": {...} }` — flexibelt och kräver inga extra tabeller.

**Priser sparas på bokningen:** `lodge_total`, `addons_total` och `total_price` sparas vid bokningstillfället så priset inte ändras i efterhand.

**Bokningsreferens:** Auto-genereras som `VL-2026-001` via en trigger — lätt att kommunicera med gäster.

**Secret token:** Varje bokning får ett unikt `secret_token` (32 hex-tecken) som skickas i bekräftelsemejlet. Gästen kan se sin bokning via en länk med token — utan att behöva logga in. RLS-policyn kräver antingen rätt token eller admin-inloggning.

**GDPR-samtycke:** Gästtabellen spårar `gdpr_consent` (obligatoriskt) och `marketing_consent` (valfritt) med tidsstämpel.

**Row Level Security:** Gäster (anon) kan se tillgänglighet och skapa bokningar. Bokningsdetaljer kräver secret_token eller admin-inloggning via Supabase Auth.

## Standardinställningar

| Nyckel | Värde |
|--------|-------|
| deposit_amount | 5000 SEK |
| max_guests | 8 |
| currency | SEK |
| booking_auto_decline_hours | 72 |
| supported_languages | en, sv, de, fr |
