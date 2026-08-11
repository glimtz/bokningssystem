# Handoff — Bokningssystem Vilhelmina Lodge

> Denna fil är en komplett statusrapport för projektet, avsedd att ges till Claude
> på en ny dator så att vi kan fortsätta arbetet utan att tappa kontext.
> Senast uppdaterad: 2026-08-07

---

## 0. Vad som är nytt sedan förra uppdateringen (2026-05-14 → 2026-08-07)

Kort sammanfattning av allt som hänt sedan handoffen senast skrevs:

- **Org.nr / personnr på gäst (2026-08-07)** — nytt frivilligt fält `guests.id_number`
  (**migration `006_add_guest_id_number.sql`**) för fakturering. Fylls i från admin i "Ny bokning" och i
  gästredigeringen, visas i gästkortet och på utskriften. Känslig PII — hanteras enligt GDPR/RLS som övriga
  gästuppgifter. (Ej exponerat i det publika bokningsflödet.)
- **Rabatt på totalpris (2026-08-07)** — admin kan ge en rabatt (i kr) på totalpriset, både i "Ny bokning"
  och via prisredigeraren i detaljvyn. Rabatten lagras inte i egen kolumn utan räknas ut som
  `(lodge_total + addons_total) − total_price`; Priser-vyn och utskriften visar Delsumma, "Rabatt −X kr (Y %)"
  och Totalt. Ersatte den tidigare "specialpris för lodge"-logiken. Kolumnen `bookings.lodge_list_price`
  (migration 005) används inte längre och kan tas bort vid tillfälle.
- **Utskrift av bokning i admin (2026-08-07)** — "🖨 Skriv ut"-knapp i bokningens detaljvy
  (`BookingDetailPage`, `handlePrint`) öppnar en ren, printbar sammanställning (gäst, boende, datum,
  tillval, priser, betalningsstatus samt ev. gästmeddelande och interna anteckningar) i ett nytt fönster
  och triggar utskrift. Helt frontend — inget skickas någonstans. (Mejl valdes bort; admin skriver ut /
  sparar som PDF och skickar själv vid behov.)
- **Nytt boendealternativ: Lillstugan (2026-08-07)** — gästen kan nu välja mellan att hyra
  *hela lodgen* (golv 4 000 kr/natt, max 8 gäster) eller *endast Lillstugan* (sovstuga + delad
  relax/bastu + grillkåta/utegrillplats, storstugan ingår ej; golv 2 000 kr/natt, max 4 gäster).
  Samma pris/person (950 kr) för båda — Lillstugan skiljer sig bara i lägre golvpris och färre
  gäster. Bokningen är fortfarande exklusiv och blockerar hela fastigheten. Implementerat via
  ny kolumn `bookings.rental_option` (`full_lodge` | `lillstuga`, **migration
  `004_add_rental_option.sql`**) och nya settings `lillstuga_min_price_per_night` (2000) och
  `lillstuga_max_guests` (4). Val finns i publika flödet (StepDates, två boendekort), admin
  "Ny bokning"-modal samt redigering i bokningsdetaljer (`BookingDetailPage`). Grilltexten är
  samtidigt förtydligad till *grillkåta + utegrillplats* (plural) på alla fyra språk.
  ⚠️ **Kvarstår:** bekräftelse-/förfrågningsmailen (Edge Function `send-booking-emails`) visar
  ännu inte vilket boende som valts — kräver manuell redeploy och tas som separat steg.
- **Vercel är nu kopplat till GitHub (2026-08-07)** — auto-deploy vid varje push till `main`.
  Root Directory är satt till `booking-frontend`, framework-preset Vite. Manuell `vercel --prod`
  behövs inte längre. Detta var tidigare en av de största punkterna på "att göra"-listan.
- **Custom domän live:** `booking.flightmode.se` är konfigurerad på Vercel (utöver `vilhelmina-lodge.vercel.app`).
- **Hunting guide / jaktguide** tillagd som eget tillval (migration `003_add_hunting_guide.sql`).
  I det publika flödet grupperas fiskeguide + jaktguide i ett gemensamt "Guide"-kort.
- **Admin kan nu skapa och redigera bokningar fullt ut** (stort tillägg i `AdminApp.jsx` + `adminApi.js`):
  - "+ Ny bokning"-modal för att skapa bokning direkt i admin, med **specialpris för lodge** (2026-08-05).
  - Redigera gästuppgifter, datum/antal gäster, samt lägga till/ändra/ta bort tillval på en befintlig bokning.
  - Justera pris manuellt med en angiven anledning (loggas i `admin_notes`).
- **Line-endings normaliserade till LF** via `.gitattributes` (2026-07-03) — CRLF-bruset i `git status` är åtgärdat.

Detaljer finns i respektive avsnitt nedan.

---

## 1. Projektöversikt

Bokningssystem för **Vilhelmina Lodge** (Flightmode Adventures AB). En fiskelodge i Vilhelmina.
Systemet hanterar bokningsförfrågningar från gäster med ett 4-stegs bokningsformulär, sparar i databas, skickar automatiska mail, och har en fullt utvecklad admin-dashboard för att hantera bokningar, priser, säsonger och blockerade datum.

- **GitHub-repo:** https://github.com/glimtz/bokningssystem
- **Supabase-projekt:** mqarsrzwwttgccwiwkir
- **Supabase URL:** https://mqarsrzwwttgccwiwkir.supabase.co
- **Vercel URL (publik bokning):** https://vilhelmina-lodge.vercel.app
- **Custom domän:** https://booking.flightmode.se
- **Admin-dashboard:** https://vilhelmina-lodge.vercel.app/admin (även `/admin` på custom-domänen)
- **Ägare:** Leif Gyllenberg (leif.gyllenberg@gmail.com)

## 2. Techstack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React 19 + Vite 8, React Router v7 (single-page med `/` publik + `/admin/*` dashboard) |
| Backend/DB | Supabase (PostgreSQL 15+ med RLS) |
| Admin-auth | Supabase Auth (email/password) |
| E-post | Supabase Edge Function + Loopia SMTP (denomailer) |
| Hosting | **Vercel** — **auto-deploy vid push till `main`** (GitHub-kopplat sedan 2026-08-07). Root Directory: `booking-frontend`. Custom domän: booking.flightmode.se |
| Repo | GitHub (glimtz/bokningssystem) |

## 3. Git-historik

```
09ebac5 Add special price option to admin New booking modal (2026-08-05)
        ⚠️ Stor "catch-all"-commit trots titeln. Innehåller även: hunting guide-tillval
        (migration 003_add_hunting_guide.sql), full bokningsredigering i admin
        (adminApi.js: updateBookingDetails/updateGuest/addBookingAddon/updateBookingAddon/
        deleteBookingAddon/updateBookingPrice/recalcBookingTotal/createBooking m.fl.),
        guide-gruppering i publika flödet (BookingApp.jsx), samt mindre ändringar i
        e-postfunktionen (index.ts).
608f9fe chore: add .gitattributes and normalize line endings to LF (2026-07-03)
dae58aa docs: add pointer to HANDOFF.md at top of Claude.md (2026-07-03)
--- allt ovan pushat; origin/main = 09ebac5 ---
f405346 fix: show contract URL as plain text alongside link (iOS Mail) (2026-05-28)
7282f7a fix: booking reference generator uses MAX instead of COUNT (2026-05-14)  [migration 003_fix_reference_generator.sql]
d19ae0e feat: admin enhancements, payment tracking, status emails (2026-05-14)
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

> ⚠️ **Migrationsnummer-krock:** det finns två filer som börjar på `003` —
> `003_fix_reference_generator.sql` (maj) och `003_add_hunting_guide.sql` (aug).
> Ofarligt eftersom de körs manuellt i SQL Editor, men döp gärna om till 004 vid tillfälle.

## 4. Mappstruktur

```
Bokningssystem/
├── Claude.md                          # Leifs profil och preferenser för Claude
├── HANDOFF.md                         # Denna fil
├── README.txt
├── .gitattributes                     # text=auto eol=lf (normaliserar line-endings)
├── kravspec-bokningssystem.md         # Kravspecifikation
├── databasschema.md                   # Databasdesign-dokumentation
├── flightmode-adventures.md           # Företagsbeskrivning
├── .github/
│   └── workflows/
│       └── keep-supabase-alive.yml   # GitHub Action — pingar Supabase var 5:e dag
├── .gitignore
├── booking-frontend/                  # ← Vercel Root Directory pekar hit
│   ├── .env                           # Supabase-credentials (INTE i git)
│   ├── .env.example                   # Mall för .env
│   ├── .vercel/                       # Vercel CLI-koppling (INTE i git — behövs ej längre)
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
│   │   ├── BookingApp.jsx             # Publikt bokningsflöde — 4-stegs wizard
│   │   ├── api.js                     # Supabase API för publika queries + booking creation
│   │   ├── supabaseClient.js          # Supabase-klient init
│   │   ├── admin/
│   │   │   ├── AdminApp.jsx           # Admin-dashboard (skapa/redigera bokningar, priser, säsonger)
│   │   │   ├── adminApi.js            # Supabase API för admin (autentiserad)
│   │   │   └── admin.css              # Stilar för dashboard
│   │   ├── App.jsx / App.css          # Äldre filer (används ej aktivt)
│   │   ├── index.css
│   │   ├── components/                # Äldre komponentstruktur
│   │   ├── context/
│   │   ├── data/
│   │   └── i18n/                      # Översättningar (en, sv, de, fr)
│   └── dist/                          # Build-output (INTE i git)
└── supabase/
    ├── .gitignore
    ├── migrations/
    │   ├── 001_initial_schema.sql            # Databas-schema (10 tabeller, RLS, seed data)
    │   ├── 002_payment_tracking.sql          # advance/final/deposit/refunded timestamps
    │   ├── 003_fix_reference_generator.sql   # ref-generator använder MAX i st f COUNT
    │   ├── 003_add_hunting_guide.sql         # tillval guide_hunting (jaktguide)
    │   ├── 004_add_rental_option.sql         # boende Lillstugan (bookings.rental_option + settings)
    │   ├── 005_add_lodge_list_price.sql      # (oanvänd numera — rabatt räknas ut, ej lagrad)
    │   └── 006_add_guest_id_number.sql       # NYTT org.nr/personnr på gäst (guests.id_number)
    ├── scripts/
    │   └── reset_test_data.sql        # Tömmer bokningar/gäster/mejlloggar inför skarpt läge
    └── functions/
        └── send-booking-emails/
            └── index.ts               # Edge Function — SMTP-mail för booking_received / booking_confirmed / booking_declined
```

## 5. Lokal setup (ny dator — t.ex. BasecampOne)

### 5.1 Förutsättningar
- **Node.js** (LTS) — https://nodejs.org — ger dig `npm`
- **Git** — för att klona repot (GitHub Desktop räcker; se not om PATH i 5.7)

### 5.2 Klona och installera

```bash
git clone https://github.com/glimtz/bokningssystem.git Bokningssystem
cd Bokningssystem/booking-frontend
npm install
```

### 5.3 Skapa .env-fil

`.env`-filerna ligger **inte** i GitHub (de innehåller hemligheter). Kopiera över dem från den gamla
datorn, eller återskapa `booking-frontend/.env` med:

```
VITE_SUPABASE_URL=https://mqarsrzwwttgccwiwkir.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYXJzcnp3d3R0Z2Njd2l3a2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzUxNjQsImV4cCI6MjA5MTE1MTE2NH0.CmI70NyaYr1NWzjpgAndMbeGvqab-LXiq0NIgX1kusE
```

> Det finns även en `.env.local` i projektroten på den gamla datorn (också gitignorerad). Ta med den
> om du använder rot-nivå-verktyg (t.ex. Supabase CLI-secrets); den behövs inte för att köra frontend.

### 5.4 Starta dev-server

```bash
cd booking-frontend
npm run dev
```

- Publikt flöde: http://localhost:5173
- Admin-dashboard: http://localhost:5173/admin

### 5.5 Deploy till produktion (Vercel — nu automatiskt)

**Sedan 2026-08-07 är Vercel-projektet kopplat till GitHub-repot.** Det betyder:

- **Pusha till `main` → Vercel bygger och deployar automatiskt till produktion.** Inget manuellt steg.
- Vercel-inställningar (redan gjorda, för referens): Settings → Git = `glimtz/bokningssystem`,
  Settings → Build and Deployment → **Root Directory = `booking-frontend`**, Framework = Vite,
  Build = `npm run build`, Output = `dist`. Env-variabler (VITE_SUPABASE_URL/ANON_KEY) ligger i Vercel.
- Verifiera en deploy: Vercel → projekt **vilhelmina-lodge** → Deployments (senaste raden ska matcha din commit och stå som "Ready"/"Production").
- Fallback vid behov: manuell deploy går fortfarande via `npx vercel --prod` från `booking-frontend`.

### 5.6 Supabase Edge Functions (deploy)

Fortfarande manuellt (ej kopplat till git):

```bash
cd Bokningssystem
npx supabase login
npx supabase functions deploy send-booking-emails --project-ref mqarsrzwwttgccwiwkir
```

Migrationer (t.ex. `003_add_hunting_guide.sql`) körs manuellt genom att klistra in i Supabase SQL Editor.

### 5.7 Not om Git-verktyg på Windows

- Leif pushar via **GitHub Desktop** (kommandot `git` ligger inte i PowerShells PATH på nuvarande dator).
  Använd Git Bash eller GitHub Desktop om `git` inte hittas i terminalen.
- Om projektet redigeras via en molnbaserad Cowork-session kan `git push` inte köras därifrån
  (sandboxen saknar nätverk) — pusha då från GitHub Desktop. Sådana sessioner kan också lämna kvar
  tomma `.git/*.lock`-filer; om git klagar på lås, radera `.git/index.lock`.

## 6. Supabase-konfiguration (redan uppsatt i molnet)

### 6.1 Databas (PostgreSQL)
- 10 tabeller: `seasons`, `pricing_periods`, `blocked_dates`, `addons`, `guests`, `bookings`, `booking_addons`, `payments`, `email_log`, `settings`
- RLS aktiverat på alla tabeller
- Bokningsreferens auto-genereras via trigger (VL-2026-001, VL-2026-002, ...) — använder MAX (migration 003_fix_reference_generator)
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
- **Två sätt att triggas:**
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
- Kontraktslänken visas även som ren text bredvid länken (workaround för iOS Mail, commit f405346)

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
- API i `adminApi.js`: `setBookingPayment(id, type, paidAt)` hanterar alla fyra
- **Auto-statusbyte:** när `advance_paid_at` sätts → status `pending → confirmed`; när `final_paid_at` sätts → status `confirmed → paid`
- UI i `BookingDetailPage`: "Betalningar"-sektion med fyra rader, varje med belopp + status + knapp "Markera mottagen" / "Ångra"

### 6.9 Reset-skript (rensa testdata)
- Fil: `supabase/scripts/reset_test_data.sql`
- Tömmer `bookings`, `booking_addons`, `payments`, `email_log`, `guests` med `TRUNCATE ... RESTART IDENTITY CASCADE`
- Behåller statisk konfiguration: `addons`, `seasons`, `pricing_periods`, `settings`
- `blocked_dates` lämnas intakt by default (utkommenterad valfri rensning)
- Verifierings-query i slutet räknar rader per tabell — använder subqueries istället för `UNION ALL` eftersom Supabase SQL Editor snubblade på `rows` som column-alias
- Skriptet kördes 2026-05-13 efter testfasen för att gå skarpt — verifierat fungerande

### 6.10 Keep-alive workflow (GitHub Actions)
- GitHub Action `.github/workflows/keep-supabase-alive.yml` pingar Supabase REST API var 5:e dag för att förhindra att free-tier-projektet pausas (pausas annars efter 7 dagars inaktivitet)
- Cron: `0 9 */5 * *` (09:00 UTC, var 5:e dag) + manuell trigger via `workflow_dispatch`
- Pingar `/rest/v1/bookings?select=id&limit=1` med anon-nyckel — accepterar 200/401/403 som lyckad körning
- GitHub Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Logg: https://github.com/glimtz/bokningssystem/actions/workflows/keep-supabase-alive.yml

### 6.11 Hunting guide / jaktguide (migration 003_add_hunting_guide.sql) — NYTT
- Lägger till tillvalet `guide_hunting` (Jaktguide): **8 000 kr/dag**, `price_type = per_day`, översatt till EN/SV/DE/FR
- Idempotent (`on conflict (slug) do update`) — säkert att köra om
- Justerar `sort_order` så guiderna hamnar bredvid varandra: boat(1), guide(2), guide_hunting(3), linens(4), cleaning(5)
- I det publika flödet grupperas fiskeguide (`guide`) och jaktguide (`guide_hunting`) i ETT "Guide"-kort där gästen kan välja endera eller båda, med egen dagväljare per typ (se `renderAddonCard` i `BookingApp.jsx`)
- **Att göra på ny miljö:** kör migrationen i SQL Editor om addonet saknas i databasen

### 6.12 Boendealternativ / rental_option (migration 004_add_rental_option.sql) — NYTT
- Lägger till kolumnen `bookings.rental_option text not null default 'full_lodge'` med
  check-constraint `in ('full_lodge', 'lillstuga')`
- Nya settings-rader: `lillstuga_min_price_per_night` (2000), `lillstuga_max_guests` (4). Migrationen
  sätter även `price_per_person_per_night` (950) och `min_price_per_night` (4000) explicit i settings
  (tidigare fanns de bara som kod-defaultar i frontend)
- Prismodell: lodge-pris/natt = `max(pris_per_person × antal_gäster, golvpris)`. Golvet är 4 000 kr
  för hela lodgen och 2 000 kr för Lillstugan; pris/person (950 kr) är gemensamt
- Frontend läser rätt golv/maxgäster per val i både publikt flöde och admin
  (`getRentalOptions` i `BookingApp.jsx`, `lodgePricePerNight`/`maxGuestsFor` i `adminApi.js`)
- **Städning:** tillvalet "Slutstädning" kostar **700 kr** när `rental_option = 'lillstuga'` (annars ordinarie
  2 500 kr). Styrs i frontend (`getAddonsList` i `BookingApp.jsx` samt admin `NewBookingModal`/`BookingDetailPage`)
  med default 700, som kan överstyras via valfri setting `lillstuga_cleaning_price`. Priset sparas på bokningen
  i `booking_addons.unit_price`, så det ligger fast även om regeln ändras senare
- Idempotent (`on conflict`), säker att köra om
- **Att göra på ny miljö:** kör migrationen i SQL Editor

## 7. Publikt bokningsflöde (end-to-end)

1. Gäst öppnar https://vilhelmina-lodge.vercel.app (eller booking.flightmode.se)
2. **Steg 1 — Datum:** Väljer först **boende** (Hela lodgen eller Endast Lillstugan — två kort som styr golvpris och max antal gäster), sedan check-in/check-out i kalender (bokade/blockerade datum visas disabled) och antal gäster
3. **Steg 2 — Tillval:** Båt (med dagväljare), **Guide-kort med fiske- och jaktguide** (var sin dagväljare), sänglinne, städning
4. **Steg 3 — Kontakt:** Namn, e-post, telefon, meddelande, GDPR-samtycke, marknadsföringssamtycke
5. **Steg 4 — Sammanfattning:** Ser priser, valda dagar för båt/guide, bekräftar
6. Frontend anropar `createBookingRequest()` i `api.js` → skapar guest + booking + booking_addons i Supabase
7. Database webhook triggar Edge Function
8. Edge Function hämtar gäst + addons (med selected_dates), bygger HTML-mail, skickar via Loopia SMTP
9. Gästen ser bekräftelsesida med referensnummer (t.ex. VL-2026-003)
10. Två mail skickas: gästbekräftelse (på gästens språk) + admin-notis till info@flightmode.se
11. Mailen visar valda dagar för båt och guide

## 8. Admin-dashboard (`/admin`)

Byggd som en enkel SPA inuti samma Vite-app, skyddad bakom Supabase Auth.

### 8.1 Sidor/routes
- **`/admin` (Stats)** — Översiktssida: fyra stat-kort (Bokningsförfrågningar, Väntande, Totala intäkter, Bokade nätter), stapeldiagram per månad (inkomna + bokningar per check_in med statusfärger), statusfördelning
- **`/admin/bookings`** — Lista med filter (status), sök (ref/namn/email), paginering. **"+ Ny bokning"-knapp** uppe till höger som öppnar skapa-modalen (se 8.4). "Öppna"-knapp per rad till detaljvyn
- **`/admin/bookings/:id`** — Detaljvy med full redigering (se 8.3)
- **`/admin/calendar`** — Årsvy med bokade/blockerade datum. Lägg till/ta bort blockerade datum
- **`/admin/seasons`** — Hantera säsonger, prisperioder, addon-priser och globala inställningar (deposition, max gäster etc.)

### 8.2 Komponenter
- `AdminApp.jsx` — alla sidor, AuthProvider, ErrorBoundary, AdminLayout med sidomeny, NewBookingModal
- `adminApi.js` — Supabase-anrop för admin (se 8.5 för nya funktioner)
- `admin.css` — egen styling

### 8.3 Bokningsredigering i detaljvyn (NYTT sedan 2026-08-05)
`BookingDetailPage` har nu full redigering utöver status/betalningar:
- **Redigera gäst** — namn, e-post, telefon, språk (`updateGuest`, "Spara")
- **Redigera bokning** — in-/utcheckning, antal gäster, med omräknat pris (`updateBookingDetails`, "Spara")
- **Tillval** — lägg till/ändra/ta bort addons på en befintlig bokning (`addBookingAddon` / `updateBookingAddon` / `deleteBookingAddon`), total räknas om (`recalcBookingTotal`)
- **Justera pris** — sätt manuellt `total_price`/`deposit_amount` med en **anledning** som loggas i `admin_notes` (`updateBookingPrice`)
- Betalningar, status-knappar, hard delete och adminanteckningar finns kvar sedan tidigare

### 8.4 Skapa bokning i admin — "+ Ny bokning" (NYTT)
- `NewBookingModal` i `AdminApp.jsx` — skapa en bokning direkt (gäst, datum, antal gäster, status, tillval)
- **Rabatt på totalpris (uppdaterad 2026-08-07):** i prissammanställningen anger admin en rabatt (i kr) på totalpriset. `lodge_total` sparas som ordinarie beräknat pris, `total_price = lodge_total + addons_total − rabatt`. Rabatten lagras inte separat utan härleds som `(lodge_total + addons_total) − total_price`. En notering läggs automatiskt i `admin_notes`, t.ex. "Rabatt: 3 000 kr (15 %) på totalpris (ordinarie 20 000 kr)". (Ersatte den tidigare kryssrutan "Specialpris för lodge".)
- Vid "Skapa bokning" anropas `createBooking({guest, booking, addons, pricing})` i `adminApi.js`

### 8.5 Nya funktioner i adminApi.js (2026-08-05)
`createBooking`, `updateBookingDetails`, `updateGuest`, `updateBookingPrice`, `recalcBookingTotal`,
`addBookingAddon`, `updateBookingAddon`, `deleteBookingAddon`, plus hjälpfunktioner
`lodgePricePerNight`, `nightsBetween`, `addonRowTotal`.

### 8.6 Skapa admin-användare
1. Supabase Dashboard → Authentication → Users → Add user
2. Email + password (t.ex. leif.gyllenberg@gmail.com)
3. Användaren kan sedan logga in på `/admin`

## 9. UI-detaljer (publikt flöde)

- **Språkväljare:** Emoji-flaggor på Mac/iOS/Android, text-fallback (EN/SV/DE/FR) på Windows
- **Stepper:** Visar stegnamn (Dates, Extras, Contact, Summary) på alla skärmstorlekar
- **Kalender:** Responsiv. Bokade datum (från `get_booked_dates`-RPC) och blockerade datum visas disabled
- **Guide-kort (NYTT):** Fiskeguide och jaktguide grupperade i ett kort — välj endera eller båda, var sin dagväljare
- **Båt-tillval:** Dagväljare (välj antal dagar → välj vilka dagar)
- **Dagväljare (båt/guide):** Vid ändring av antal dagar behålls redan valda dagar (trimmas om man minskar)
- **Checkbox-spacing:** Tydligt mellanrum mellan GDPR/marknadsförings-checkboxar och formulärfält

## 10. Kända problem och teknisk skuld

- [ ] **Migrationsfilen 001 är inte synkad** — RLS-fixar och `get_booked_dates`-RPC gjordes direkt i SQL Editor. (migration 002 och 003 är synkade som filer)
- [ ] **Två migrationer med nummer 003** — `003_fix_reference_generator.sql` och `003_add_hunting_guide.sql`. Byt gärna det senare till 004
- [ ] **SMTP-lösenord bör bytas** — exponerades i chatt-session
- [ ] **FROM-adress:** Mail skickas från `leif.gyllenberg@glimtz.se` istället för `info@flightmode.se`. Lösning: separat SMTP för info@flightmode.se i Loopia
- [ ] **SPF/DKIM saknas för flightmode.se** — confirmation-mail hamnar i skräppost. Behöver DNS-konfiguration
- [ ] **Inga betalningar (automatik)** — Stripe/Swish ej integrerat. Idag manuellt via UI
- [ ] **Resend-konto skapat** — API-nyckel finns men används inte (vi kör Loopia SMTP). Kan avaktiveras
- [ ] **Edge Function-deploy är manuell** — kräver `npx supabase functions deploy ...`
- [ ] **Avtals-PDF har platshållare** — `/bokningsavtal.pdf` är generisk mall. Fas 2: generera ifylld PDF per bokning
- [ ] **Mail visar inte valt boende** — bekräftelse-/förfrågningsmailen (`send-booking-emails`) nämner ännu inte om bokningen avser hela lodgen eller endast Lillstugan. Priset i mailet stämmer (lodge_total speglar rätt golv), men själva boendenamnet saknas. Kräver Edge Function-redeploy
- [ ] **Mail-utskick saknas för betalningar och avbokningar** — `payment_confirmed`, `cancellation` ej byggda
- [ ] **Påminnelse- och välkomstmail saknas** — `reminder`, `welcome` definierade men ej byggda (kräver schedulerad körning)
- [x] **~~Vercel-deploy är manuell~~** — ✅ Löst 2026-08-07: GitHub-kopplat, auto-deploy vid push till main
- [x] **~~Windows/Git CRLF-brus~~** — ✅ Löst 2026-07-03 via `.gitattributes` (text=auto eol=lf)
- [ ] **`.env`-filer ligger inte i git** — måste kopieras manuellt vid byte av dator (se 5.3)

## 11. Planerade nästa steg

1. **~~Admin-dashboard~~** — ✅ Klar (commit d49b982)
2. **~~Hard delete för bokningar~~** — ✅ Klar 2026-05-14
3. **~~Payment tracking (manuell)~~** — ✅ Klar 2026-05-14 (migration 002 + UI)
4. **~~Mail för bekräftelse/nekande~~** — ✅ Klar 2026-05-14
5. **~~Restore-knapp för avbokade/nekade bokningar~~** — ✅ Klar 2026-05-14
6. **~~Koppla Vercel till GitHub (auto-deploy)~~** — ✅ Klar 2026-08-07
7. **~~Egen domän (booking.flightmode.se)~~** — ✅ Konfigurerad på Vercel
8. **~~Hunting guide-tillval~~** — ✅ Klar 2026-08-05 (migration 003 + publikt Guide-kort)
9. **~~Skapa/redigera bokningar i admin + specialpris~~** — ✅ Klar 2026-08-05
9b. **~~Boendealternativ Lillstugan~~** — ✅ Klar 2026-08-07 (migration 004 + publikt boendeval + admin skapa/redigera)
9c. **Visa valt boende i mailen** — lägg till Lillstugan/hela lodgen i `send-booking-emails` (4 språk) + redeploy
10. **Fas 2 mailtyper:** `payment_confirmed`, `cancellation`
11. **Fas 3 mailtyper:** `reminder`, `welcome` — kräver schedulerad körning
12. **Stripe/Swish-integration** — automatisk bokningsavgift/slutbetalning
13. **SPF/DKIM för flightmode.se** — så mail inte hamnar i skräppost
14. **Byta FROM-adress** — till info@flightmode.se med eget SMTP-konto
15. **Synka migrationsfil 001** — RLS-fixar och `get_booked_dates`-RPC
16. **Ifylld avtals-PDF** — generera per bokning i Edge Function
17. **Byt namn på dubbel-003-migrationen** till 004
18. **Admin-utökningar (ev.):** exportera bokningar till CSV, iCal-feed, email-mall-editor

## 12. Språk och preferenser

- Konversation: **Svenska**
- Kod och tekniska termer: **Engelska**
- Tonalitet: Professionellt men avslappnat
- Leif är på mellannivå inom programmering — förklara tekniska val kort men tydligt
- Se `Claude.md` i repo-roten för full profil
