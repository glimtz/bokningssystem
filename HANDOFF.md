# Handoff — Bokningssystem Vilhelmina Lodge

> Denna fil är en komplett statusrapport för projektet, avsedd att ges till Claude
> på en ny dator så att vi kan fortsätta arbetet utan att tappa kontext.
> Senast uppdaterad: 2026-05-14

---

## 1. Projektöversikt

Bokningssystem för **Vilhelmina Lodge** (Flightmode Adventures AB). En fiskelodge i Vilhelmina.
Systemet hanterar bokningsförfrågningar från gäster med ett 4-stegs bokningsformulär, sparar i databas, skickar automatiska mail, och har en fullt utvecklad admin-dashboard för att hantera bokningar, priser, säsonger och blockerade datum.

- **GitHub-repo:** https://github.com/glimtz/bokningssystem
- **Supabase-projekt:** mqarsrzwwttgccwiwkir
- **Supabase URL:** https://mqarsrzwwttgccwiwkir.supabase.co
- **Vercel URL (publik bokning):** https://vilhelmina-lodge.vercel.app
- **Admin-dashboard:** https://vilhelmina-lodge.vercel.app/admin
- **Ägare:** Leif Gyllenberg (leif.gyllenberg@gmail.com)

## 2. Techstack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React 19 + Vite 8, React Router v7 (single-page med `/` publik + `/admin/*` dashboard) |
| Backend/DB | Supabase (PostgreSQL 15+ med RLS) |
| Admin-auth | Supabase Auth (email/password) |
| E-post | Supabase Edge Function + Loopia SMTP (denomailer) |
| Hosting | **Vercel** (https://vilhelmina-lodge.vercel.app) — manuell deploy via `npx vercel --prod` |
| Repo | GitHub (glimtz/bokningssystem) |

## 3. Git-historik

```
(2026-05-14 dagens arbete — ej committat ännu)
aa47f71 docs: update handoff with reset script (2026-05-13)
aab3010 fix: rewrite verification query using subqueries to avoid 'rows' keyword conflict
2cb1a53 chore: add SQL script to reset test bookings before going live
b03e839 docs: add keep-alive workflow to handoff
2245a18 Add GitHub Action to keep Supabase project alive
196d335 docs: update handoff with admin dashboard and RPC info
fada692 chore: gitignore supabase CLI temp files
d49b982 feat: admin dashboard + booked dates in public calendar
c9a6e7f docs: update handoff, remove duplicate readmes
a7ff85c docs: update handoff with latest changes
3a7e79b fix: preserve selected dates when changing addon day count
fc3fcb5 docs: update handoff with Vercel deploy, UI fixes, boat date picker
c1d7cd7 feat: UI improvements and boat date picker
301473e docs: add handoff file for multi-machine development
9ef1729 feat: add booking email notifications via Loopia SMTP
7b40699 feat: connect frontend to Supabase with live booking flow
a03bc3b feat: add Supabase database schema for booking system
e59ba88 feat: booking request system for Vilhelmina Lodge
```

## 4. Mappstruktur

```
Bokningssystem/
├── Claude.md                          # Leifs profil och preferenser för Claude
├── HANDOFF.md                         # Denna fil
├── README.txt
├── kravspec-bokningssystem.md         # Kravspecifikation
├── databasschema.md                   # Databasdesign-dokumentation
├── flightmode-adventures.md           # Företagsbeskrivning
├── .github/
│   └── workflows/
│       └── keep-supabase-alive.yml   # GitHub Action — pingar Supabase var 5:e dag
├── .gitignore
├── booking-frontend/
│   ├── .env                           # Supabase-credentials (INTE i git)
│   ├── .env.example                   # Mall för .env
│   ├── .vercel/                       # Vercel-konfiguration (INTE i git)
│   ├── vercel.json                    # SPA-rewrites (alla routes → index.html)
│   ├── package.json                   # React 19, Vite 8, supabase-js, react-router-dom 7
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── bokningsavtal.pdf         # Statiskt avtal som länkas i confirmation-mail
│   ├── src/
│   │   ├── main.jsx                   # Entry point + React Router (/, /admin/*)
│   │   ├── BookingApp.jsx             # Publikt bokningsflöde — 4-stegs wizard (~1000 rader)
│   │   ├── api.js                     # Supabase API för publika queries + booking creation
│   │   ├── supabaseClient.js          # Supabase-klient init
│   │   ├── admin/
│   │   │   ├── AdminApp.jsx           # Admin-dashboard (~1280 rader, 6 sidor)
│   │   │   ├── adminApi.js            # Supabase API för admin (autentiserad)
│   │   │   └── admin.css              # Stilar för dashboard
│   │   ├── App.jsx / App.css          # Äldre filer (används ej aktivt)
│   │   ├── index.css
│   │   ├── components/                # Äldre komponentstruktur
│   │   ├── context/
│   │   ├── data/
│   │   └── i18n/                      # Översättningar (en, sv, de, fr)
│   └── dist/                          # Build-output
└── supabase/
    ├── .gitignore
    ├── migrations/
    │   ├── 001_initial_schema.sql     # Databas-schema (10 tabeller, RLS, seed data)
    │   └── 002_payment_tracking.sql   # Lägger till advance_paid_at / final_paid_at / deposit_paid_at / deposit_refunded_at
    ├── scripts/
    │   └── reset_test_data.sql        # Tömmer bokningar/gäster/mejlloggar inför skarpt läge
    └── functions/
        └── send-booking-emails/
            └── index.ts               # Edge Function — SMTP-mail för booking_received / booking_confirmed / booking_declined
```

## 5. Lokal setup (ny dator)

### 5.1 Förutsättningar
- **Node.js** (LTS) — https://nodejs.org — ger dig `npm`
- **Git** — för att klona repot

### 5.2 Klona och installera

```bash
cd Documents\Claude\Flightmode Adventures
git clone https://github.com/glimtz/bokningssystem.git Bokningssystem
cd Bokningssystem\booking-frontend
npm install
```

### 5.3 Skapa .env-fil

Skapa filen `booking-frontend/.env` med:

```
VITE_SUPABASE_URL=https://mqarsrzwwttgccwiwkir.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYXJzcnp3d3R0Z2Njd2l3a2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzUxNjQsImV4cCI6MjA5MTE1MTE2NH0.CmI70NyaYr1NWzjpgAndMbeGvqab-LXiq0NIgX1kusE
```

### 5.4 Starta dev-server

```bash
cd booking-frontend
npm run dev
```

- Publikt flöde: http://localhost:5173
- Admin-dashboard: http://localhost:5173/admin

### 5.5 Vercel-deploy (redan kopplat)

Frontend är deployad på Vercel. Env-variabler (VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY) är konfigurerade i Vercel. För att deploya ändringar:

```bash
cd booking-frontend
npx vercel login          # Krävs första gången på ny dator — öppnar webbläsaren
npx vercel --prod         # Bygger och deployar till produktion
```

`vercel.json` sköter SPA-rewrites så att `/admin` och andra klient-routes pekar på `index.html`.

### 5.6 Supabase Edge Functions (deploy)

För att deploya Edge Functions efter ändringar:

```bash
cd Bokningssystem
npx supabase login
npx supabase functions deploy send-booking-emails --project-ref mqarsrzwwttgccwiwkir
```

## 6. Supabase-konfiguration (redan uppsatt i molnet)

### 6.1 Databas (PostgreSQL)
- 10 tabeller: `seasons`, `pricing_periods`, `blocked_dates`, `addons`, `guests`, `bookings`, `booking_addons`, `payments`, `email_log`, `settings`
- RLS aktiverat på alla tabeller
- Bokningsreferens auto-genereras via trigger (VL-2026-001, VL-2026-002, ...)
- Secret token per bokning för gäståtkomst

### 6.2 RPC-funktioner (direkt i SQL Editor, EJ i migrationsfilen)
- `get_booked_dates()` — security definer-funktion som låter anon hämta bokade datum för kalendern utan direkt access till `bookings`-tabellen. Returnerar en array av datum där status är confirmed/paid.

### 6.3 RLS-fixar (applicerade direkt i SQL Editor, EJ i migrationsfilen)
Migrationsfilen (001_initial_schema.sql) har fortfarande de gamla RLS-policyerna.
Följande fixar gjordes direkt i Supabase SQL Editor:

**Problem 1:** `FOR ALL`-policies blockerade anon INSERT p.g.a. att USING-villkoret ärvdes till with_check.
**Fix:** Droppade ALL-policies för guests/bookings/booking_addons och skapade separata SELECT/UPDATE/DELETE/INSERT-policies för admin.

**Problem 2:** `INSERT...RETURNING` (supabase-js `.insert().select()`) kräver både INSERT och SELECT policy.
**Fix:** La till SELECT-policies med `USING (true)` för anon på guests, bookings, booking_addons.

**OBS:** Dessa fixar bör synkas tillbaka till migrationsfilen för att hålla den konsekvent.

### 6.4 Admin-autentisering
- Admin loggar in via Supabase Auth (email + lösenord) på `/admin`
- Adminanvändaren är skapad direkt i Supabase Dashboard → Authentication → Users
- RLS-policies för admin använder `auth.uid() IS NOT NULL` (authenticated role) för full CRUD-access
- Sessionen lagras i webbläsaren av supabase-js (localStorage)

### 6.5 Edge Function — send-booking-emails
- Deployad i Supabase
- **Två sätt att triggas (sedan 2026-05-14):**
  1. **Database Webhook** på `bookings` INSERT → skickar `booking_received` (gäst + admin-notis till info@flightmode.se)
  2. **Direkt HTTP-anrop** från admin-UI via `supabase.functions.invoke(...)` med `{event_type, booking_id}` → skickar `booking_confirmed` eller `booking_declined`
- CORS-headers + OPTIONS preflight stödjs (krävs för browser-anrop)
- Använder Loopia SMTP via denomailer (port 465, TLS)
- Avsändare: `Vilhelmina Lodge <leif.gyllenberg@glimtz.se>`
- **Mailtyper som är byggda:**
  - `booking_received` — bekräftelse till gäst + admin-notis. 4 språk (EN/SV/DE/FR)
  - `booking_confirmed` — när admin godkänner. Innehåller betalningsbox (50% bokningsavgift + slutbetalning + deposition), nyckelvillkor (avbokningspolicy etc.), länk till statisk PDF (`/bokningsavtal.pdf`). 4 språk
  - `booking_declined` — när admin nekar. Kort artig text på 4 språk
- **Mailtyper i email_type-enum men ej byggda än:** `payment_request`, `payment_confirmed`, `reminder`, `welcome`, `cancellation` (planerat fas 2)
- HTML är optimerad för Outlook (använder `<div>` i stället för `<p>`, pixel-baserad `line-height`, `mso-line-height-rule: exactly`)

### 6.6 Supabase Secrets (satta via CLI)
```
SMTP_HOST = mailcluster.loopia.se
SMTP_PORT = 465
SMTP_USER = leif.gyllenberg@glimtz.se
SMTP_PASS = [lösenord — bör bytas, var exponerat i chatt]
```

### 6.7 Database Webhook
- Name: send-booking-emails
- Table: bookings
- Event: INSERT
- Type: Supabase Edge Function → send-booking-emails

### 6.8 Payment tracking (migration 002)
- Migration `002_payment_tracking.sql` lägger till fyra timestamp-kolumner på `bookings`:
  - `advance_paid_at` — bokningsavgift (50%) mottagen → krävs för bekräftelse
  - `final_paid_at` — slutbetalning (50%) mottagen
  - `deposit_paid_at` — säkerhetsdeposition (5 000 kr) mottagen
  - `deposit_refunded_at` — säkerhetsdeposition återbetald efter avsyning
- Belopp beräknas dynamiskt i UI: bokningsavgift och slutbetalning som `total_price * 0.5`, deposition från `bookings.deposit_amount`
- Migration kördes i Supabase SQL Editor 2026-05-14 (CASCADE-säker: `add column if not exists`)
- API i `adminApi.js`: `setBookingPayment(id, type, paidAt)` hanterar alla fyra
- **Auto-statusbyte:** när `advance_paid_at` sätts → status `pending → confirmed`; när `final_paid_at` sätts → status `confirmed → paid`
- UI i `BookingDetailPage`: "Betalningar"-sektion med fyra rader, varje med belopp + status + knapp "Markera mottagen" / "Ångra"

### 6.9 Reset-skript (rensa testdata)
- Fil: `supabase/scripts/reset_test_data.sql`
- Tömmer `bookings`, `booking_addons`, `payments`, `email_log`, `guests` med `TRUNCATE ... RESTART IDENTITY CASCADE`
- Behåller statisk konfiguration: `addons`, `seasons`, `pricing_periods`, `settings`
- `blocked_dates` lämnas intakt by default (utkommenterad valfri rensning)
- Verifierings-query i slutet räknar rader per tabell — använder subqueries istället för `UNION ALL` eftersom Supabase SQL Editor snubblade på `rows` som column-alias
- Användning: klistra in i Supabase SQL Editor → kör → kontrollera att transaktionstabeller är 0 och statiska tabeller har sitt innehåll kvar
- Efter rensning: nästa bokning får automatiskt `VL-2026-001` igen (triggern `generate_booking_reference` räknar `count(*) + 1`)
- Skriptet kördes 2026-05-13 efter testfasen för att gå skarpt — verifierat fungerande på riktig testdata

### 6.10 Keep-alive workflow (GitHub Actions)
- GitHub Action `.github/workflows/keep-supabase-alive.yml` pingar Supabase REST API var 5:e dag för att förhindra att free-tier-projektet pausas (pausas annars efter 7 dagars inaktivitet)
- Cron: `0 9 */5 * *` (09:00 UTC, var 5:e dag) + manuell trigger via `workflow_dispatch`
- Pingar `/rest/v1/bookings?select=id&limit=1` med anon-nyckel — accepterar 200/401/403 som lyckad körning (alla räknas som projektaktivitet)
- GitHub Secrets som används (konfigurerade i repo settings → Secrets and variables → Actions):
  - `SUPABASE_URL` = `https://mqarsrzwwttgccwiwkir.supabase.co`
  - `SUPABASE_ANON_KEY` = anon-nyckeln (samma som i `.env`)
- Logg och manuell körning: https://github.com/glimtz/bokningssystem/actions/workflows/keep-supabase-alive.yml

## 7. Publikt bokningsflöde (end-to-end)

1. Gäst öppnar https://vilhelmina-lodge.vercel.app
2. **Steg 1 — Datum:** Väljer check-in/check-out i kalender (bokade/blockerade datum visas disabled), antal gäster
3. **Steg 2 — Tillval:** Båt (med dagväljare), guide (med dagväljare), sänglinne, städning
4. **Steg 3 — Kontakt:** Namn, e-post, telefon, meddelande, GDPR-samtycke, marknadsföringssamtycke
5. **Steg 4 — Sammanfattning:** Ser priser, valda dagar för båt/guide, bekräftar
6. Frontend anropar `createBookingRequest()` i `api.js` → skapar guest + booking + booking_addons i Supabase
7. Database webhook triggar Edge Function
8. Edge Function hämtar gäst + addons (med selected_dates), bygger HTML-mail, skickar via Loopia SMTP
9. Gästen ser bekräftelsesida med referensnummer (t.ex. VL-2026-003)
10. Två mail skickas: gästbekräftelse (på gästens språk) + admin-notis till info@flightmode.se
11. Mailen visar valda dagar för båt och guide (t.ex. "→ 15 maj, 17 maj")

## 8. Admin-dashboard (`/admin`)

Byggd som en enkel SPA inuti samma Vite-app, skyddad bakom Supabase Auth.

### 8.1 Sidor/routes
- **`/admin` (Stats)** — Översiktssida. Visar:
  - Fyra stat-kort: Bokningsförfrågningar [år], Väntande, Totala intäkter, Bokade nätter
  - "Inkomna bokningsförfrågningar per månad ([år])" — stapeldiagram baserat på `created_at`
  - "Status fördelning" — antal/procent per status
  - "Bokningar per månad ([år])" — stacked stapeldiagram baserat på `check_in` med tre färgsegment (Bekräftade/Betalda/Genomförda)
- **`/admin/bookings`** — Lista över alla bokningar med filter (status), sök (ref/namn/email), paginering. Åtgärd-kolumnen visar enbart en "Öppna"-knapp som tar till detaljvyn (sedan 2026-05-14)
- **`/admin/bookings/:id`** — Detaljvy för enskild bokning. Innehåller:
  - Gäst, datum, addons, priser, adminanteckningar
  - **Betalningar-sektion** (sedan 2026-05-14): bokningsavgift, slutbetalning, säkerhetsdeposition, återbetalning — vardera med "Markera mottagen" / "Ångra"
  - **Status-knappar:** Godkänn/Neka (pending) → Betald/Avboka (confirmed) → Genomförd/Avboka (paid). Återställ-till-väntande-knapp för declined/cancelled (sedan 2026-05-14)
  - Bekräftelsedialog vid alla destruktiva status-byten (Avboka, Neka, Godkänn, Återställ)
  - **Mailutskick automatiskt** vid Godkänn (booking_confirmed) och Neka (booking_declined)
  - **Farlig zon-sektion** med hard delete (sedan 2026-05-14) — tar bort bokningen ur databasen permanent. booking_addons + payments cascade-raderas, email_log behålls
- **`/admin/calendar`** — Årsvy med alla bokade och blockerade datum. Kan lägga till/ta bort blockerade datum (manuellt eller t.ex. Airbnb-synk-markering)
- **`/admin/seasons`** — Hantera säsonger, prisperioder, addon-priser och globala inställningar (deposition-storlek, max gäster etc.)

### 8.2 Komponenter
- `AdminApp.jsx` — innehåller alla sidor, AuthProvider, ErrorBoundary, AdminLayout med sidomeny
- `adminApi.js` — Supabase-anrop för admin: auth, bookings CRUD, seasons/pricing CRUD, blocked_dates CRUD, stats-aggregering, addons, settings
- `admin.css` — egen styling (separat från det publika flödet)

### 8.3 Skapa admin-användare
Admin läggs till direkt i Supabase Dashboard:
1. Authentication → Users → Add user
2. Email + password (t.ex. leif.gyllenberg@gmail.com)
3. Användaren kan sedan logga in på `/admin`

## 9. UI-detaljer (publikt flöde)

- **Språkväljare:** Emoji-flaggor på Mac/iOS/Android, text-fallback (EN/SV/DE/FR) på Windows
- **Stepper:** Visar stegnamn (Dates, Extras, Contact, Summary) på alla skärmstorlekar
- **Kalender:** Responsiv — fungerar på smala mobiler (Samsung Flip-5) utan avklippta dagar. Bokade datum (från `get_booked_dates`-RPC) och blockerade datum visas disabled
- **Lodge-kort:** Feature-taggar med ✓-ikon (visar att alla stugor ingår)
- **Båt-tillval:** Har dagväljare precis som guide (välj antal dagar → välj vilka dagar)
- **Dagväljare (båt/guide):** Vid ändring av antal dagar behålls redan valda dagar (trimmas om man minskar). Tidigare nollställdes alla val.
- **Checkbox-spacing:** Tydligt mellanrum mellan GDPR/marknadsförings-checkboxar och formulärfält

## 10. Kända problem och teknisk skuld

- [ ] **Migrationsfilen är inte synkad** — RLS-fixar och `get_booked_dates`-RPC gjordes direkt i SQL Editor, migrationsfilen har gamla policies. (Note: migration 002 är synkad)
- [ ] **SMTP-lösenord bör bytas** — exponerades i chatt-session
- [ ] **FROM-adress:** Mail skickas från `leif.gyllenberg@glimtz.se` istället för `info@flightmode.se` (Loopia kräver att avsändaren matchar SMTP-kontot). Lösning: sätt upp separat SMTP för info@flightmode.se i Loopia
- [ ] **SPF/DKIM saknas för flightmode.se** — confirmation-mail hamnar i skräppost. Behöver konfigureras hos DNS-leverantör
- [ ] **Inga betalningar (automatik)** — Stripe/Swish ej integrerat. Idag manuellt: admin markerar betalningar mottagna via UI:t (sedan 2026-05-14)
- [ ] **Resend-konto skapat** — API-nyckel finns men används inte (vi gick med Loopia SMTP). Kan avaktiveras
- [ ] **Vercel-deploy är manuell** — kräver `npx vercel --prod` från terminalen. Kan kopplas till GitHub för auto-deploy
- [ ] **Edge Function-deploy är manuell** — kräver `npx supabase functions deploy send-booking-emails ...` från terminalen
- [ ] **Avtals-PDF har platshållare** — `/bokningsavtal.pdf` är generisk mall med `[Namn]` etc. Inte personalanpassad per bokning. Förbättring i fas 2: generera ifylld PDF on-the-fly i Edge Function
- [ ] **Mail-utskick saknas för betalningar och avbokningar** — när bokningsavgift markeras mottagen eller en bokning avbokas skickas inget mail. Planerat fas 2 (`payment_confirmed`, `cancellation`)
- [ ] **Påminnelse- och välkomstmail saknas** — `reminder` och `welcome` definierade i schemat men ej byggda. Behöver schedulerad körning (cron eller GitHub Action)
- [ ] **Variabelt belopp för förskott/slutbetalning** — idag hårdkodat 50/50, ingen möjlighet att t.ex. säga "kräv 8 000 kr i förskott" för en specifik bokning
- [ ] **Windows/Git CRLF-brus** — `git status` visar ibland 9 filer som "modified" enbart p.g.a. line-endings. Kan lösas med en `.gitattributes` som sätter `* text=auto eol=lf`, men är i nuläget ofarligt (filerna är identiska efter CRLF-normalisering)

## 11. Planerade nästa steg

1. **~~Admin-dashboard~~** — ✅ Klar (commit d49b982)
2. **~~Hard delete för bokningar~~** — ✅ Klar 2026-05-14
3. **~~Payment tracking (manuell)~~** — ✅ Klar 2026-05-14 (migration 002 + UI)
4. **~~Mail för bekräftelse/nekande~~** — ✅ Klar 2026-05-14 (booking_confirmed + booking_declined på 4 språk)
5. **~~Restore-knapp för avbokade/nekade bokningar~~** — ✅ Klar 2026-05-14
6. **Fas 2 mailtyper:** `payment_confirmed`, `cancellation` (när betalningar registreras / bokning avbokas)
7. **Fas 3 mailtyper:** `reminder` (X dagar före ankomst), `welcome` (vid ankomst) — kräver schedulerad körning
8. **Koppla Vercel till GitHub** — auto-deploy vid push
9. **Egen domän** — t.ex. booking.flightmode.se på Vercel
10. **Stripe/Swish-integration** — automatisk hantering av bokningsavgift och slutbetalning
11. **SPF/DKIM för flightmode.se** — så mail inte hamnar i skräppost
12. **Byta FROM-adress** — till info@flightmode.se med eget SMTP-konto
13. **Synka migrationsfil 001** — uppdatera med RLS-fixarna och `get_booked_dates`-RPC
14. **Ifylld avtals-PDF** — generera per bokning i Edge Function (i stället för statisk mall)
15. **Admin-utökningar (ev.):** exportera bokningar till CSV, iCal-feed för kalender, email-mall-editor

## 12. Språk och preferenser

- Konversation: **Svenska**
- Kod och tekniska termer: **Engelska**
- Tonalitet: Professionellt men avslappnat
- Leif är på mellannivå inom programmering — förklara tekniska val kort men tydligt
- Se `Claude.md` i repo-roten för full profil
