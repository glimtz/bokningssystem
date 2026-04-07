# Kravspec – Bokningssystem Vilhelmina Lodge

> Flightmode Adventures AB | Version 0.2 | 2026-04-05

---

## Bakgrund

Vilhelmina Lodge är en exklusiv fiskelodge vid Vojmån, norr om Vilhelmina i norra Sverige, med fokus på premiumupplevelser inom ädelfiske, gädda och abborre. Lodgen består av en storstuga, en sovstuga, en relax- och bastustuga samt grillplats. Man hyr hela lodgen (max 8 gäster) för 4 000 kr/dag.

Bokningssystemet ska spegla Flightmodes kärn-DNA: kvalitet, exklusivitet och en sömlös gästupplevelse — från första kontakt till hemresa.

## Målgrupp

- Sportfiskare (Norden och Europa)
- Smågrupper och sällskap (upp till 8 personer)
- Gäster som värderar premium och personlig service framför volym och lågt pris

## Övergripande mål

1. Ge gästen en enkel och professionell bokningsupplevelse
2. Ge Flightmode full kontroll över bokningar, tillgänglighet och prissättning
3. Minimera manuell administration
4. Stödja säsongsbaserad verksamhet

## Funktionella krav

### Gästens vy (frontend)

- **Kalendervy** — Se lediga perioder i realtid
- **Lodge-info** — Presentation av Vilhelmina Lodge (4 000 kr/dag, max 8 gäster)
- **Tillval** — Båthyra (Alloycraft J370, 1 000 kr/dag) och fiskeguide (8 000 kr/dag inkl lunch)
- **Bokningsformulär** — Namn, kontaktuppgifter, antal gäster, önskemål/allergier
- **Förfrågan** — Gästen skickar en bokningsförfrågan (inte direktbokning)
- **Bekräftelse** — Tydlig bokningsbekräftelse via e-post efter manuellt godkännande
- **Deposition** — Gästen betalar en deposition vid bekräftad bokning (ej återbetalningsbar), resten betalas på plats

### Administratörens vy (backend)

- **Dashboard** — Översikt över alla bokningar, beläggning och intäkter
- **Kalenderhantering** — Öppna/stänga perioder, blockera stugor
- **Prissättning** — Sätta pris per stuga, paket och säsong
- **Gästregister** — Kontaktuppgifter, historik, anteckningar
- **Kommunikation** — Skicka bekräftelser, påminnelser och välkomstinfo automatiskt
- **Rapporter** — Beläggningsgrad, intäkter per period, populära paket

### Integrationer

- **Betalning** — Stripe (kortbetalning) och Swish
- **E-post** — Automatiska bokningsbekräftelser och påminnelser
- **Webbplats** — Integreras med flightmode.se (inbäddad via iFrame)
- **Kalender** — Synk med Google Calendar (internt)
- **Airbnb** — iCal-synk för tillgänglighet

## Icke-funktionella krav

- **Responsivt** — Fungera lika bra på mobil som desktop
- **Flerspråkigt** — Engelska som huvudspråk, med stöd för svenska, tyska och franska
- **Säkerhet** — GDPR-kompatibel hantering av personuppgifter
- **Tillgänglighet** — Snabb laddtid, enkel navigation
- **Skalbarhet** — Möjlighet att utöka med fler stugor eller destinationer i framtiden

## Tonalitet & design

Bokningsupplevelsen ska kännas premium men enkel:

- Ren, modern design i linje med Flightmodes varumärke
- Naturnära bildspråk
- Tydlig och personlig kommunikation — inte generiskt eller byråkratiskt
- Varje steg i bokningsflödet ska kännas genomtänkt

## Säsongsaspekter

- Lodgen är säsongsbaserad (uppskattningsvis maj–september)
- Systemet ska hantera öppning/stängning av säsong
- Olika prissättning beroende på period (högsäsong vs övrig tid)

## Teknisk miljö

- **Webbplats:** flightmode.se
- **Plattform:** WordPress
- **Hosting:** Loopia
- **SEO:** Rank Math
- **Befintliga sidor:** About, Contact, Experiences
- **Bokningsfunktion idag:** Ingen — behöver byggas

### Tekniska val

- **Frontend:** React — byggs till statiska filer, bäddas in på WordPress-sajten via iFrame
- **Backend:** Supabase (PostgreSQL-databas + automatiskt API, hosted)
- **Frontend-hosting:** Loopia (samma som WordPress)
- **Backend-hosting:** Supabase Cloud (gratis tier till start)
- **Betalning:** Stripe (kort) + Swish
- **Admin-autentisering:** Supabase Auth

## Beslut

- **Bokningsflöde:** Förfrågan → manuellt godkännande → bekräftelse
- **Betalning:** Stripe (kort) + Swish
- **Avbokning:** Depositionsmodell — 3 000–5 000 kr, ej återbetalningsbar
- **Externa plattformar:** Airbnb via iCal-synk
- **Bokningsfönster:** Hela säsongen öppnas på en gång
- **Teknik:** React (statisk build) + Supabase (backend/databas)
- **Integration:** Inbäddad på flightmode.se via iFrame
- **Frontend-hosting:** Loopia
- **Backend-hosting:** Supabase Cloud
- **Flerspråkighet:** Engelska som huvudspråk + svenska, tyska, franska
- **App/Webb:** Beslutas senare

## Öppna frågor

- [ ] Exakt depositionsbelopp (3 000 eller 5 000 kr?)
- [ ] App eller bara responsiv webb?
- [ ] Vilken e-posttjänst för transaktionella mejl?
- [ ] Stugdetaljer — antal bäddar, faciliteter, bilder per stuga?
- [ ] Avbokningsregler — tidsfrister och villkor?
- [ ] Timeout på bokningsförfrågan — vad händer om admin inte svarar inom X timmar?

## Faser

### Fas 1 — MVP

- Kalendervy med tillgänglighet
- Paketval och stugval
- Bokningsförfrågan (formulär)
- Flerspråkigt: engelska (huvudspråk), svenska, tyska, franska
- Admin-dashboard (godkänna/neka förfrågningar)
- Bokningsbekräftelse via e-post
- Stripe-betalning (deposition)
- Grundläggande adminvy (kalender, bokningar)

### Fas 2 — Utökning

- Swish-betalning
- Tillval (guidning, utrustning, måltider)
- Gästregister med historik
- Google Calendar-synk
- Airbnb iCal-synk
- Rapporter och statistik

### Fas 3 — Optimering

- Automatiska påminnelser och välkomstmejl
- Avancerad prissättning (högsäsong/lågsäsong)
- Eventuell app eller PWA

## Nästa steg

1. ✅ Gå igenom och förfina kraven
2. Ta fram databasschema (Supabase)
3. Wireframes / flödesschema för bokningsprocessen
4. Bygga MVP (fas 1)
5. Testa och iterera
