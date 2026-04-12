# Handoff — Bokningssystem Vilhelmina Lodge

> Denna fil är en komplett statusrapport för projektet, avsedd att ges till Claude
> på en ny dator så att vi kan fortsätta arbetet utan att tappa kontext.
> Senast uppdaterad: 2026-04-12

---

## 1. Projektöversikt

Bokningssystem för **Vilhelmina Lodge** (Flightmode Adventures AB). En fiskelodge i Vilhelmina.
Systemet hanterar bokningsförfrågningar från gäster med ett 4-stegs bokningsformulär, sparar i databas, och skickar automatiska mail.

- **GitHub-repo:** https://github.com/glimtz/bokningssystem
- **Supabase-projekt:** mqarsrzwwttgccwiwkir
- **Supabase URL:** https://mqarsrzwwttgccwiwkir.supabase.co
- **Vercel URL:** https://vilhelmina-lodge.vercel.app
- **Ägare:** Leif Gyllenberg (leif.gyllenberg@gmail.com)

## 2. Techstack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React 19 + Vite 8 (single-page booking wizard) |
| Backend/DB | Supabase (PostgreSQL 15+ med RLS) |
| E-post | Supabase Edge Function + Loopia SMTP (denomailer) |
| Hosting | **Vercel** (https://vilhelmina-lodge.vercel.app) |
| Repo | GitHub (glimtz/bokningssystem) |

## 3. Git-historik

```
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
├── kravspec-bokningssystem.md         # Kravspecifikation
├── databasschema.md                   # Databasdesign-dokumentation
├── flightmode-adventures.md           # Företagsbeskrivning
├── .gitignore
├── booking-frontend/
│   ├── .env                           # Supabase-credentials (INTE i git)
│   ├── .env.example                   # Mall för .env
│   ├── .vercel/                       # Vercel-konfiguration (INTE i git)
│   ├── package.json                   # React 19, Vite 8, supabase-js
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── main.jsx                   # Entry point
│   │   ├── BookingApp.jsx             # Huvudkomponent — ~930 rader, 4-stegs wizard
│   │   ├── api.js                     # Supabase API-funktioner
│   │   ├── supabaseClient.js          # Supabase-klient init
│   │   ├── App.jsx / App.css          # Äldre filer (används ej aktivt)
│   │   ├── index.css
│   │   ├── components/                # Äldre komponentstruktur
│   │   ├── context/
│   │   ├── data/
│   │   └── i18n/                      # Översättningar (en, sv, de, fr)
│   └── dist/                          # Build-output
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql     # Databas-schema (10 tabeller, RLS, seed data)
    └── functions/
        └── send-booking-emails/
            └── index.ts               # Edge Function — SMTP-mail vid ny bokning
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

Öppna http://localhost:5173

### 5.5 Vercel-deploy (redan kopplat)

Frontend är deployad på Vercel. Env-variabler (VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY) är konfigurerade i Vercel. För att deploya ändringar:

```bash
cd booking-frontend
npx vercel login          # Krävs första gången på ny dator — öppnar webbläsaren
npx vercel --prod         # Bygger och deployar till produktion
```

### 5.6 Supabase Edge Functions (deploy)

För att deploya Edge Functions efter ändringar:

```bash
cd Bokningssystem
npx supabase login
npx supabase functions deploy send-booking-emails --project-ref mqarsrzwwttgccwiwkir
```

## 6. Supabase-konfiguration (redan uppsatt i molnet)

### 6.1 Databas (PostgreSQL)
- 10 tabeller: seasons, pricing_periods, blocked_dates, addons, guests, bookings, booking_addons, payments, email_log, settings
- RLS aktiverat på alla tabeller
- Bokningsreferens auto-genereras via trigger (VL-2026-001, VL-2026-002, ...)
- Secret token per bokning för gäståtkomst

### 6.2 RLS-fixar (applicerade direkt i SQL Editor, EJ i migrationsfilen)
Migrationsfilen (001_initial_schema.sql) har fortfarande de gamla RLS-policyerna.
Följande fixar gjordes direkt i Supabase SQL Editor:

**Problem 1:** `FOR ALL`-policies blockerade anon INSERT p.g.a. att USING-villkoret ärvdes till with_check.
**Fix:** Droppade ALL-policies för guests/bookings/booking_addons och skapade separata SELECT/UPDATE/DELETE/INSERT-policies för admin.

**Problem 2:** `INSERT...RETURNING` (supabase-js `.insert().select()`) kräver både INSERT och SELECT policy.
**Fix:** La till SELECT-policies med `USING (true)` för anon på guests, bookings, booking_addons.

**OBS:** Dessa fixar bör synkas tillbaka till migrationsfilen för att hålla den konsekvent.

### 6.3 Edge Function — send-booking-emails
- Deployad i Supabase
- Triggas via Database Webhook på `bookings` INSERT
- Skickar 2 mail: gästbekräftelse (4 språk) + admin-notis till info@flightmode.se
- Använder Loopia SMTP via denomailer (port 465, TLS)
- Avsändare: `Vilhelmina Lodge <leif.gyllenberg@glimtz.se>`
- Mail visar bokningsdetaljer, priser, valda dagar för båt/guide, och nästa steg

### 6.4 Supabase Secrets (satta via CLI)
```
SMTP_HOST = mailcluster.loopia.se
SMTP_PORT = 465
SMTP_USER = leif.gyllenberg@glimtz.se
SMTP_PASS = [lösenord — bör bytas, var exponerat i chatt]
```

### 6.5 Database Webhook
- Name: send-booking-emails
- Table: bookings
- Event: INSERT
- Type: Supabase Edge Function → send-booking-emails

## 7. Bokningsflöde (end-to-end)

1. Gäst öppnar https://vilhelmina-lodge.vercel.app
2. **Steg 1 — Datum:** Väljer check-in/check-out i kalender, antal gäster
3. **Steg 2 — Tillval:** Båt (med dagväljare), guide (med dagväljare), sänglinne, städning
4. **Steg 3 — Kontakt:** Namn, e-post, telefon, meddelande, GDPR-samtycke, marknadsföringssamtycke
5. **Steg 4 — Sammanfattning:** Ser priser, valda dagar för båt/guide, bekräftar
6. Frontend anropar `createBookingRequest()` i api.js → skapar guest + booking + booking_addons i Supabase
7. Database webhook triggar Edge Function
8. Edge Function hämtar gäst + addons (med selected_dates), bygger HTML-mail, skickar via Loopia SMTP
9. Gästen ser bekräftelsesida med referensnummer (t.ex. VL-2026-003)
10. Två mail skickas: gästbekräftelse (på gästens språk) + admin-notis till info@flightmode.se
11. Mailen visar valda dagar för båt och guide (t.ex. "→ 15 maj, 17 maj")

## 8. UI-detaljer (senaste fixar)

- **Språkväljare:** Emoji-flaggor på Mac/iOS/Android, text-fallback (EN/SV/DE/FR) på Windows
- **Stepper:** Visar stegnamn (Dates, Extras, Contact, Summary) på alla skärmstorlekar
- **Kalender:** Responsiv — fungerar på smala mobiler (Samsung Flip-5) utan avklippta dagar
- **Lodge-kort:** Feature-taggar med ✓-ikon (visar att alla stugor ingår)
- **Båt-tillval:** Har dagväljare precis som guide (välj antal dagar → välj vilka dagar)
- **Dagväljare (båt/guide):** Vid ändring av antal dagar behålls redan valda dagar (trimmas om man minskar). Tidigare nollställdes alla val.
- **Checkbox-spacing:** Tydligt mellanrum mellan GDPR/marknadsförings-checkboxar och formulärfält

## 9. Kända problem och teknisk skuld

- [ ] **Migrationsfilen är inte synkad** — RLS-fixar gjordes direkt i SQL Editor, migrationsfilen har gamla policies
- [ ] **SMTP-lösenord bör bytas** — exponerades i chatt-session
- [ ] **FROM-adress:** Mail skickas från `leif.gyllenberg@glimtz.se` istället för `info@flightmode.se` (Loopia kräver att avsändaren matchar SMTP-kontot). Lösning: sätt upp separat SMTP för info@flightmode.se i Loopia
- [ ] **Ingen admin-dashboard** — bokningar hanteras direkt i Supabase Dashboard
- [ ] **Inga betalningar** — Stripe/Swish-integration planerad men ej byggd
- [ ] **Resend-konto skapat** — API-nyckel finns men används inte (vi gick med Loopia SMTP). Kan avaktiveras.
- [ ] **Vercel-deploy är manuell** — kräver `npx vercel --prod` från terminalen. Kan kopplas till GitHub för auto-deploy.

## 10. Planerade nästa steg

1. **Admin-dashboard** — godkänn/neka bokningar, se kalender, hantera säsonger
2. **Koppla Vercel till GitHub** — auto-deploy vid push
3. **Egen domän** — t.ex. booking.flightmode.se på Vercel
4. **Betalningsintegration** — Stripe för deposition
5. **Byta FROM-adress** — till info@flightmode.se med eget SMTP-konto
6. **Synka migrationsfil** — uppdatera 001_initial_schema.sql med RLS-fixarna

## 11. Språk och preferenser

- Konversation: **Svenska**
- Kod och tekniska termer: **Engelska**
- Tonalitet: Professionellt men avslappnat
- Leif är på mellannivå inom programmering — förklara tekniska val kort men tydligt
- Se Claude.md i repo-roten för full profil
