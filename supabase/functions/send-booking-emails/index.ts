// supabase/functions/send-booking-emails/index.ts
//
// Skickar mail via Loopia SMTP för olika bokningshändelser.
//
// Triggas på två sätt:
//   1. Database Webhook på bookings INSERT  → skickar booking_received (gäst + admin)
//   2. Direkt anrop från admin-UI med JSON  → skickar booking_confirmed eller booking_declined
//      Payload: { event_type: 'booking_confirmed' | 'booking_declined', booking_id: uuid }
//
// Auth: Database Webhook använder service-role, admin-UI använder auth-användarens JWT.
// Edge Function kontrollerar JWT om event_type är angiven (admin-flöde).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mailcluster.loopia.se";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER")!;
const SMTP_PASS = Deno.env.get("SMTP_PASS")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM_EMAIL = "leif.gyllenberg@glimtz.se";
const FROM_NAME = "Vilhelmina Lodge";
const ADMIN_EMAIL = "info@flightmode.se";
const PUBLIC_SITE = "https://vilhelmina-lodge.vercel.app";
const CONTRACT_URL = `${PUBLIC_SITE}/bokningsavtal.pdf`;

// CORS-headers för anrop från admin-UI i webbläsaren
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================
// TYPES
// ============================================================

interface BookingData {
  reference: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  lodge_total: number;
  addons_total: number;
  total_price: number;
  deposit_amount: number;
  message: string | null;
  guest_name: string;
  guest_email: string;
  guest_language: string;
  addons: Array<{ name: string; quantity: number; total_price: number; selected_dates: string[] | null }>;
}

type EventType = "booking_received" | "booking_confirmed" | "booking_declined";
type Lang = "en" | "sv" | "de" | "fr";

// ============================================================
// TRANSLATIONS
// ============================================================
// Strukturen: translations[event_type][language] = { ...strängar }

const translations: Record<EventType, Record<Lang, Record<string, string>>> = {
  booking_received: {
    en: {
      subject: "Booking Request Received — Vilhelmina Lodge",
      greeting: "Thank you for your booking request!",
      intro: "We have received your request and will get back to you within 24 hours.",
      refLabel: "Booking reference",
      datesLabel: "Dates",
      guestsLabel: "Guests",
      nightsLabel: "nights",
      lodgeLabel: "Lodge",
      addonsLabel: "Add-ons",
      totalLabel: "Total",
      depositLabel: "Deposit",
      messageLabel: "Your message",
      nextSteps: "What happens next?",
      step1: "We review your request and check availability.",
      step2: "You receive a confirmation with payment details.",
      step3: "Once the booking fee is paid, your booking is secured.",
      closing: "We look forward to welcoming you to Vilhelmina Lodge!",
      team: "The Flightmode Adventures Team",
    },
    sv: {
      subject: "Bokningsförfrågan mottagen — Vilhelmina Lodge",
      greeting: "Tack för din bokningsförfrågan!",
      intro: "Vi har tagit emot din förfrågan och återkommer inom 24 timmar.",
      refLabel: "Bokningsreferens",
      datesLabel: "Datum",
      guestsLabel: "Gäster",
      nightsLabel: "nätter",
      lodgeLabel: "Lodge",
      addonsLabel: "Tillval",
      totalLabel: "Totalt",
      depositLabel: "Deposition",
      messageLabel: "Ditt meddelande",
      nextSteps: "Vad händer nu?",
      step1: "Vi granskar din förfrågan och kontrollerar tillgänglighet.",
      step2: "Du får en bekräftelse med betalningsuppgifter.",
      step3: "När bokningsavgiften är betald är din bokning säkrad.",
      closing: "Vi ser fram emot att välkomna dig till Vilhelmina Lodge!",
      team: "Flightmode Adventures-teamet",
    },
    de: {
      subject: "Buchungsanfrage erhalten — Vilhelmina Lodge",
      greeting: "Vielen Dank für Ihre Buchungsanfrage!",
      intro: "Wir haben Ihre Anfrage erhalten und melden uns innerhalb von 24 Stunden.",
      refLabel: "Buchungsreferenz",
      datesLabel: "Daten",
      guestsLabel: "Gäste",
      nightsLabel: "Nächte",
      lodgeLabel: "Lodge",
      addonsLabel: "Zusatzoptionen",
      totalLabel: "Gesamt",
      depositLabel: "Anzahlung",
      messageLabel: "Ihre Nachricht",
      nextSteps: "Wie geht es weiter?",
      step1: "Wir prüfen Ihre Anfrage und die Verfügbarkeit.",
      step2: "Sie erhalten eine Bestätigung mit Zahlungsdetails.",
      step3: "Nach Eingang der Buchungsgebühr ist Ihre Buchung gesichert.",
      closing: "Wir freuen uns, Sie in der Vilhelmina Lodge willkommen zu heißen!",
      team: "Das Flightmode Adventures Team",
    },
    fr: {
      subject: "Demande de réservation reçue — Vilhelmina Lodge",
      greeting: "Merci pour votre demande de réservation !",
      intro: "Nous avons bien reçu votre demande et vous répondrons dans les 24 heures.",
      refLabel: "Référence de réservation",
      datesLabel: "Dates",
      guestsLabel: "Invités",
      nightsLabel: "nuits",
      lodgeLabel: "Lodge",
      addonsLabel: "Options",
      totalLabel: "Total",
      depositLabel: "Acompte",
      messageLabel: "Votre message",
      nextSteps: "Que se passe-t-il ensuite ?",
      step1: "Nous examinons votre demande et vérifions la disponibilité.",
      step2: "Vous recevrez une confirmation avec les détails de paiement.",
      step3: "Une fois les frais de réservation payés, votre réservation est confirmée.",
      closing: "Nous avons hâte de vous accueillir au Vilhelmina Lodge !",
      team: "L'équipe Flightmode Adventures",
    },
  },
  booking_confirmed: {
    en: {
      subject: "Booking Confirmed — Payment Required — Vilhelmina Lodge",
      greeting: "Good news — your booking is confirmed!",
      intro: "We have reviewed and approved your request. To secure your booking, please pay the booking fee (50% of the total) within 7 days.",
      refLabel: "Booking reference",
      datesLabel: "Dates",
      guestsLabel: "Guests",
      nightsLabel: "nights",
      lodgeLabel: "Lodge",
      addonsLabel: "Add-ons",
      totalLabel: "Total",
      bookingFeeLabel: "Booking fee (50%) — due now",
      finalPaymentLabel: "Final payment (50%) — due 30 days before arrival",
      depositLabel: "Security deposit",
      messageLabel: "Your message",
      paymentHeading: "How to pay",
      paymentInstructions: "Please contact us at info@flightmode.se to receive payment details (bank transfer or Swish). Reference your booking number when paying.",
      termsHeading: "Key terms",
      term1: "Booking is only valid once the booking fee has been received.",
      term2: "Final payment (remaining 50%) is due no later than 30 days before arrival.",
      term3: "A security deposit of 5,000 SEK is paid separately and refunded after inspection.",
      term4: "Cancellation: 5% admin fee if cancelled 30+ days before arrival; 50% refund 14–30 days; no refund within 14 days.",
      contractLink: "Read the full booking agreement",
      closing: "We look forward to welcoming you to Vilhelmina Lodge!",
      team: "The Flightmode Adventures Team",
    },
    sv: {
      subject: "Bokning bekräftad — Betalning krävs — Vilhelmina Lodge",
      greeting: "Goda nyheter — din bokning är bekräftad!",
      intro: "Vi har granskat och godkänt din förfrågan. För att säkra din bokning ber vi dig betala bokningsavgiften (50% av totalbeloppet) inom 7 dagar.",
      refLabel: "Bokningsreferens",
      datesLabel: "Datum",
      guestsLabel: "Gäster",
      nightsLabel: "nätter",
      lodgeLabel: "Lodge",
      addonsLabel: "Tillval",
      totalLabel: "Totalt",
      bookingFeeLabel: "Bokningsavgift (50%) — ska betalas nu",
      finalPaymentLabel: "Slutbetalning (50%) — senast 30 dagar före ankomst",
      depositLabel: "Säkerhetsdeposition",
      messageLabel: "Ditt meddelande",
      paymentHeading: "Så här betalar du",
      paymentInstructions: "Kontakta oss på info@flightmode.se för att få betalningsuppgifter (bankgiro eller Swish). Ange bokningsreferens vid betalning.",
      termsHeading: "Viktiga villkor",
      term1: "Bokningen är giltig först när bokningsavgiften har mottagits.",
      term2: "Slutbetalning (resterande 50%) ska vara oss tillhanda senast 30 dagar före ankomst.",
      term3: "Säkerhetsdeposition på 5 000 kr betalas separat och återbetalas efter avsyning.",
      term4: "Avbokning: 5% administrationsavgift vid 30+ dagar före ankomst; 50% återbetalning 14–30 dagar; ingen återbetalning inom 14 dagar.",
      contractLink: "Läs hela bokningsavtalet",
      closing: "Vi ser fram emot att välkomna dig till Vilhelmina Lodge!",
      team: "Flightmode Adventures-teamet",
    },
    de: {
      subject: "Buchung bestätigt — Zahlung erforderlich — Vilhelmina Lodge",
      greeting: "Gute Nachrichten — Ihre Buchung ist bestätigt!",
      intro: "Wir haben Ihre Anfrage geprüft und genehmigt. Um Ihre Buchung zu sichern, bitten wir Sie, die Buchungsgebühr (50% des Gesamtbetrags) innerhalb von 7 Tagen zu bezahlen.",
      refLabel: "Buchungsreferenz",
      datesLabel: "Daten",
      guestsLabel: "Gäste",
      nightsLabel: "Nächte",
      lodgeLabel: "Lodge",
      addonsLabel: "Zusatzoptionen",
      totalLabel: "Gesamt",
      bookingFeeLabel: "Buchungsgebühr (50%) — jetzt fällig",
      finalPaymentLabel: "Restzahlung (50%) — fällig 30 Tage vor Ankunft",
      depositLabel: "Sicherheitskaution",
      messageLabel: "Ihre Nachricht",
      paymentHeading: "So bezahlen Sie",
      paymentInstructions: "Bitte kontaktieren Sie uns unter info@flightmode.se, um Zahlungsdetails zu erhalten (Banküberweisung oder Swish). Geben Sie bei der Zahlung Ihre Buchungsreferenz an.",
      termsHeading: "Wichtige Bedingungen",
      term1: "Die Buchung ist erst gültig, wenn die Buchungsgebühr eingegangen ist.",
      term2: "Die Restzahlung (verbleibende 50%) ist spätestens 30 Tage vor Ankunft fällig.",
      term3: "Eine Sicherheitskaution von 5.000 SEK wird separat bezahlt und nach der Abnahme zurückerstattet.",
      term4: "Stornierung: 5% Verwaltungsgebühr bei Stornierung 30+ Tage vor Ankunft; 50% Rückerstattung 14–30 Tage; keine Rückerstattung innerhalb von 14 Tagen.",
      contractLink: "Vollständige Buchungsvereinbarung lesen",
      closing: "Wir freuen uns, Sie in der Vilhelmina Lodge willkommen zu heißen!",
      team: "Das Flightmode Adventures Team",
    },
    fr: {
      subject: "Réservation confirmée — Paiement requis — Vilhelmina Lodge",
      greeting: "Bonne nouvelle — votre réservation est confirmée !",
      intro: "Nous avons examiné et approuvé votre demande. Pour sécuriser votre réservation, veuillez payer les frais de réservation (50% du total) dans les 7 jours.",
      refLabel: "Référence de réservation",
      datesLabel: "Dates",
      guestsLabel: "Invités",
      nightsLabel: "nuits",
      lodgeLabel: "Lodge",
      addonsLabel: "Options",
      totalLabel: "Total",
      bookingFeeLabel: "Frais de réservation (50%) — à payer maintenant",
      finalPaymentLabel: "Paiement final (50%) — dû 30 jours avant l'arrivée",
      depositLabel: "Caution de sécurité",
      messageLabel: "Votre message",
      paymentHeading: "Comment payer",
      paymentInstructions: "Veuillez nous contacter à info@flightmode.se pour recevoir les détails de paiement (virement bancaire ou Swish). Indiquez votre référence de réservation lors du paiement.",
      termsHeading: "Conditions clés",
      term1: "La réservation n'est valable qu'une fois les frais de réservation reçus.",
      term2: "Le paiement final (50% restants) est dû au plus tard 30 jours avant l'arrivée.",
      term3: "Une caution de sécurité de 5 000 SEK est payée séparément et remboursée après inspection.",
      term4: "Annulation : 5% de frais administratifs si annulé 30+ jours avant l'arrivée ; 50% de remboursement 14–30 jours ; aucun remboursement dans les 14 jours.",
      contractLink: "Lire l'accord de réservation complet",
      closing: "Nous avons hâte de vous accueillir au Vilhelmina Lodge !",
      team: "L'équipe Flightmode Adventures",
    },
  },
  booking_declined: {
    en: {
      subject: "Booking Request Declined — Vilhelmina Lodge",
      greeting: "Thank you for your interest in Vilhelmina Lodge",
      intro: "Unfortunately we are unable to accommodate your booking request for the dates below. The most common reasons are that the dates are already booked or that the lodge is closed during this period.",
      refLabel: "Booking reference",
      datesLabel: "Requested dates",
      guestsLabel: "Guests",
      nightsLabel: "nights",
      altDates: "We would be happy to discuss alternative dates with you. Just reply to this email or contact us at info@flightmode.se.",
      closing: "Thank you for considering Vilhelmina Lodge — we hope to welcome you another time.",
      team: "The Flightmode Adventures Team",
    },
    sv: {
      subject: "Bokningsförfrågan avslagen — Vilhelmina Lodge",
      greeting: "Tack för ditt intresse för Vilhelmina Lodge",
      intro: "Tyvärr kan vi inte tillmötesgå din bokningsförfrågan för datumen nedan. De vanligaste orsakerna är att datumen redan är bokade eller att lodgen är stängd under perioden.",
      refLabel: "Bokningsreferens",
      datesLabel: "Önskade datum",
      guestsLabel: "Gäster",
      nightsLabel: "nätter",
      altDates: "Vi diskuterar gärna alternativa datum med dig — svara på det här mejlet eller kontakta oss på info@flightmode.se.",
      closing: "Tack för att du övervägde Vilhelmina Lodge — vi hoppas få välkomna dig en annan gång.",
      team: "Flightmode Adventures-teamet",
    },
    de: {
      subject: "Buchungsanfrage abgelehnt — Vilhelmina Lodge",
      greeting: "Vielen Dank für Ihr Interesse an der Vilhelmina Lodge",
      intro: "Leider können wir Ihre Buchungsanfrage für die untenstehenden Daten nicht berücksichtigen. Die häufigsten Gründe sind, dass die Daten bereits ausgebucht sind oder die Lodge in diesem Zeitraum geschlossen ist.",
      refLabel: "Buchungsreferenz",
      datesLabel: "Gewünschte Daten",
      guestsLabel: "Gäste",
      nightsLabel: "Nächte",
      altDates: "Gerne besprechen wir alternative Termine mit Ihnen. Antworten Sie einfach auf diese E-Mail oder kontaktieren Sie uns unter info@flightmode.se.",
      closing: "Vielen Dank, dass Sie die Vilhelmina Lodge in Betracht gezogen haben — wir hoffen, Sie ein anderes Mal begrüßen zu dürfen.",
      team: "Das Flightmode Adventures Team",
    },
    fr: {
      subject: "Demande de réservation refusée — Vilhelmina Lodge",
      greeting: "Merci pour votre intérêt pour Vilhelmina Lodge",
      intro: "Malheureusement, nous ne pouvons pas accepter votre demande de réservation pour les dates ci-dessous. Les raisons les plus courantes sont que les dates sont déjà réservées ou que le lodge est fermé pendant cette période.",
      refLabel: "Référence de réservation",
      datesLabel: "Dates demandées",
      guestsLabel: "Invités",
      nightsLabel: "nuits",
      altDates: "Nous serions heureux de discuter de dates alternatives avec vous. Répondez simplement à cet e-mail ou contactez-nous à info@flightmode.se.",
      closing: "Merci d'avoir considéré Vilhelmina Lodge — nous espérons vous accueillir une autre fois.",
      team: "L'équipe Flightmode Adventures",
    },
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
}

function countNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE").format(amount) + " SEK";
}

function buildAddonRows(addons: BookingData["addons"]): string {
  if (addons.length === 0) return "";
  return addons.map((a) => {
    let row = `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatSEK(a.total_price)}</td></tr>`;
    if (a.selected_dates && a.selected_dates.length > 0) {
      const datesStr = a.selected_dates.map((d) => formatDateShort(d)).join(", ");
      row += `<tr><td colspan="2" style="padding:2px 12px 8px;color:#888;font-size:12px;font-style:italic;border-bottom:1px solid #eee">→ ${datesStr}</td></tr>`;
    }
    return row;
  }).join("");
}

function buildAdminAddonRows(addons: BookingData["addons"]): string {
  if (addons.length === 0) return "<tr><td style='padding:6px 12px;color:#999' colspan='2'>Inga tillval</td></tr>";
  return addons.map((a) => {
    let row = `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.name} (x${a.quantity})</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatSEK(a.total_price)}</td></tr>`;
    if (a.selected_dates && a.selected_dates.length > 0) {
      const datesStr = a.selected_dates.map((d) => formatDateShort(d)).join(", ");
      row += `<tr><td colspan="2" style="padding:2px 12px 8px;color:#888;font-size:12px;font-style:italic;border-bottom:1px solid #eee">→ ${datesStr}</td></tr>`;
    }
    return row;
  }).join("");
}

function pickLang(lang: string): Lang {
  return (["en", "sv", "de", "fr"].includes(lang) ? lang : "en") as Lang;
}

// ============================================================
// EMAIL TEMPLATES — booking_received (oförändrad design)
// ============================================================

function buildReceivedGuestEmailHtml(data: BookingData): string {
  const lang = pickLang(data.guest_language);
  const t = translations.booking_received[lang];
  const nights = countNights(data.check_in, data.check_out);
  const addonsRows = buildAddonRows(data.addons);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:600">Vilhelmina Lodge</h1>
    <p style="color:#a8c5b4;margin:8px 0 0;font-size:14px">Flightmode Adventures</p>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="color:#1a3a2a;margin:0 0 8px;font-size:20px">${t.greeting}</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">${t.intro}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:8px;padding:4px;margin-bottom:24px">
      <tr><td style="padding:12px 16px;font-weight:600;color:#1a3a2a;border-bottom:1px solid #e8ede9">${t.refLabel}</td><td style="padding:12px 16px;text-align:right;border-bottom:1px solid #e8ede9;font-weight:600;color:#1a3a2a;font-size:16px">${data.reference}</td></tr>
      <tr><td style="padding:12px 16px;color:#555;border-bottom:1px solid #e8ede9">${t.datesLabel}</td><td style="padding:12px 16px;text-align:right;color:#333;border-bottom:1px solid #e8ede9">${formatDate(data.check_in)} — ${formatDate(data.check_out)} (${nights} ${t.nightsLabel})</td></tr>
      <tr><td style="padding:12px 16px;color:#555;border-bottom:1px solid #e8ede9">${t.guestsLabel}</td><td style="padding:12px 16px;text-align:right;color:#333;border-bottom:1px solid #e8ede9">${data.num_guests}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555">${t.lodgeLabel}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatSEK(data.lodge_total)}</td></tr>
      ${addonsRows}
      <tr><td style="padding:10px 12px;font-weight:700;font-size:16px;color:#1a3a2a;border-top:2px solid #1a3a2a">${t.totalLabel}</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;color:#1a3a2a;border-top:2px solid #1a3a2a">${formatSEK(data.total_price)}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">${t.depositLabel}</td><td style="padding:6px 12px;text-align:right;color:#888">${formatSEK(data.deposit_amount)}</td></tr>
    </table>
    ${data.message ? `<div style="background:#f8faf9;border-radius:8px;padding:16px;margin-bottom:24px"><p style="margin:0 0 4px;font-weight:600;color:#1a3a2a;font-size:13px">${t.messageLabel}</p><p style="margin:0;color:#555;font-size:14px;line-height:1.5">${data.message}</p></div>` : ""}
    <h3 style="color:#1a3a2a;margin:0 0 12px;font-size:16px">${t.nextSteps}</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:8px 0;color:#555;font-size:14px;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#1a3a2a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;vertical-align:middle">1</span>${t.step1}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#1a3a2a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;vertical-align:middle">2</span>${t.step2}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#1a3a2a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;vertical-align:middle">3</span>${t.step3}</td></tr>
    </table>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0">${t.closing}</p>
    <p style="color:#1a3a2a;font-weight:600;margin:16px 0 0">${t.team}</p>
  </td></tr>
  <tr><td style="background:#f4f6f9;padding:24px 40px;text-align:center">
    <p style="margin:0;color:#999;font-size:12px">Flightmode Adventures AB — info@flightmode.se</p>
    <p style="margin:4px 0 0;color:#999;font-size:12px">flightmode.se</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildReceivedAdminEmailHtml(data: BookingData): string {
  const nights = countNights(data.check_in, data.check_out);
  const addonsRows = buildAdminAddonRows(data.addons);

  return `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#c45a20;padding:24px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">Ny bokningsförfrågan</h1>
    <p style="color:#ffd9c0;margin:4px 0 0;font-size:24px;font-weight:700">${data.reference}</p>
  </td></tr>
  <tr><td style="padding:32px 40px">
    <h3 style="color:#333;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px">Gästinformation</h3>
    <table width="100%" style="margin-bottom:24px;background:#f8f9fa;border-radius:8px">
      <tr><td style="padding:10px 16px;color:#666;width:120px">Namn</td><td style="padding:10px 16px;font-weight:600">${data.guest_name}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">E-post</td><td style="padding:10px 16px"><a href="mailto:${data.guest_email}" style="color:#c45a20">${data.guest_email}</a></td></tr>
      <tr><td style="padding:10px 16px;color:#666">Språk</td><td style="padding:10px 16px">${data.guest_language.toUpperCase()}</td></tr>
    </table>
    <h3 style="color:#333;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px">Bokningsdetaljer</h3>
    <table width="100%" style="margin-bottom:24px;background:#f8f9fa;border-radius:8px">
      <tr><td style="padding:10px 16px;color:#666;width:120px">Incheckning</td><td style="padding:10px 16px;font-weight:600">${formatDate(data.check_in)}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">Utcheckning</td><td style="padding:10px 16px;font-weight:600">${formatDate(data.check_out)}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">Nätter</td><td style="padding:10px 16px">${nights}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">Gäster</td><td style="padding:10px 16px">${data.num_guests}</td></tr>
    </table>
    <h3 style="color:#333;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px">Prissättning</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555">Lodge</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatSEK(data.lodge_total)}</td></tr>
      ${addonsRows}
      <tr><td style="padding:10px 12px;font-weight:700;font-size:16px;border-top:2px solid #333">Totalt</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;border-top:2px solid #333">${formatSEK(data.total_price)}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">Deposition</td><td style="padding:6px 12px;text-align:right;color:#888">${formatSEK(data.deposit_amount)}</td></tr>
    </table>
    ${data.message ? `<h3 style="color:#333;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px">Meddelande från gästen</h3><div style="background:#fff8e1;border-left:4px solid #ffc107;padding:12px 16px;border-radius:4px;margin-bottom:24px"><p style="margin:0;color:#555;font-size:14px;line-height:1.5">${data.message}</p></div>` : ""}
    <div style="text-align:center;padding:16px 0">
      <p style="color:#999;font-size:13px;margin:0">Logga in i admin-panelen för att godkänna eller neka förfrågan.</p>
    </div>
  </td></tr>
  <tr><td style="background:#f4f6f9;padding:20px 40px;text-align:center">
    <p style="margin:0;color:#999;font-size:12px">Vilhelmina Lodge Bokningssystem — Flightmode Adventures AB</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ============================================================
// EMAIL TEMPLATES — booking_confirmed
// ============================================================

function buildConfirmedGuestEmailHtml(data: BookingData): string {
  const lang = pickLang(data.guest_language);
  const t = translations.booking_confirmed[lang];
  const nights = countNights(data.check_in, data.check_out);
  const bookingFee = Math.round(data.total_price * 0.5);
  const finalPayment = data.total_price - bookingFee;
  const addonsRows = buildAddonRows(data.addons);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body, table, td, div, p { margin: 0; padding: 0; mso-line-height-rule: exactly; }
  .text { font-size: 15px; line-height: 22px; color: #555; }
  @media only screen and (max-width: 480px) {
    .wrap { padding: 16px 8px !important; }
    .card-pad { padding: 24px 20px !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9"><tr><td class="wrap" style="padding:32px 16px" align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
    <div style="color:#fff;font-size:24px;font-weight:600;line-height:28px">Vilhelmina Lodge</div>
    <div style="color:#a8c5b4;margin-top:8px;font-size:14px;line-height:18px">Flightmode Adventures</div>
  </td></tr>
  <tr><td class="card-pad" style="padding:32px 32px">
    <div style="color:#1a3a2a;font-size:20px;font-weight:600;line-height:26px;margin-bottom:12px">${t.greeting}</div>
    <div class="text" style="margin-bottom:24px">${t.intro}</div>

    <!-- Booking details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:8px;margin-bottom:24px">
      <tr><td style="padding:12px 16px;font-weight:600;color:#1a3a2a;border-bottom:1px solid #e8ede9">${t.refLabel}</td><td style="padding:12px 16px;text-align:right;border-bottom:1px solid #e8ede9;font-weight:600;color:#1a3a2a;font-size:16px">${data.reference}</td></tr>
      <tr><td style="padding:12px 16px;color:#555;border-bottom:1px solid #e8ede9">${t.datesLabel}</td><td style="padding:12px 16px;text-align:right;color:#333;border-bottom:1px solid #e8ede9">${formatDate(data.check_in)} — ${formatDate(data.check_out)} (${nights} ${t.nightsLabel})</td></tr>
      <tr><td style="padding:12px 16px;color:#555">${t.guestsLabel}</td><td style="padding:12px 16px;text-align:right;color:#333">${data.num_guests}</td></tr>
    </table>

    <!-- Payment box (highlighted) -->
    <div style="background:#fff8e1;border:2px solid #f0c040;border-radius:8px;padding:20px;margin-bottom:24px">
      <div style="color:#1a3a2a;font-size:16px;font-weight:600;line-height:22px;margin-bottom:12px">${t.paymentHeading}</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#555;font-weight:600;line-height:20px">${t.bookingFeeLabel}</td><td style="padding:6px 0;text-align:right;font-weight:700;font-size:18px;line-height:22px;color:#c45a20">${formatSEK(bookingFee)}</td></tr>
        <tr><td style="padding:6px 0;color:#555;font-size:13px;line-height:18px">${t.finalPaymentLabel}</td><td style="padding:6px 0;text-align:right;color:#888;font-size:13px;line-height:18px">${formatSEK(finalPayment)}</td></tr>
        <tr><td style="padding:6px 0;color:#555;font-size:13px;line-height:18px">${t.depositLabel}</td><td style="padding:6px 0;text-align:right;color:#888;font-size:13px;line-height:18px">${formatSEK(data.deposit_amount)}</td></tr>
      </table>
      <div style="margin-top:12px;color:#555;font-size:14px;line-height:20px">${t.paymentInstructions}</div>
    </div>

    <!-- Price breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555;line-height:20px">${t.lodgeLabel}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;line-height:20px">${formatSEK(data.lodge_total)}</td></tr>
      ${addonsRows}
      <tr><td style="padding:10px 12px;font-weight:700;font-size:16px;line-height:22px;color:#1a3a2a;border-top:2px solid #1a3a2a">${t.totalLabel}</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;line-height:22px;color:#1a3a2a;border-top:2px solid #1a3a2a">${formatSEK(data.total_price)}</td></tr>
    </table>

    <!-- Terms summary -->
    <div style="color:#1a3a2a;font-size:16px;font-weight:600;line-height:22px;margin-bottom:8px">${t.termsHeading}</div>
    <div style="color:#555;font-size:14px;line-height:20px;margin-bottom:8px">• ${t.term1}</div>
    <div style="color:#555;font-size:14px;line-height:20px;margin-bottom:8px">• ${t.term2}</div>
    <div style="color:#555;font-size:14px;line-height:20px;margin-bottom:8px">• ${t.term3}</div>
    <div style="color:#555;font-size:14px;line-height:20px;margin-bottom:20px">• ${t.term4}</div>

    <!-- Contract link -->
    <div style="margin-bottom:24px"><a href="${CONTRACT_URL}" style="color:#1a3a2a;text-decoration:underline;font-size:14px;line-height:20px">📄 ${t.contractLink}</a></div>

    <div class="text" style="margin-bottom:12px">${t.closing}</div>
    <div style="color:#1a3a2a;font-weight:600;font-size:15px;line-height:22px">${t.team}</div>
  </td></tr>
  <tr><td style="background:#f4f6f9;padding:20px 32px;text-align:center">
    <div style="color:#999;font-size:12px;line-height:16px">Flightmode Adventures AB — info@flightmode.se</div>
    <div style="color:#999;font-size:12px;line-height:16px;margin-top:4px">flightmode.se</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ============================================================
// EMAIL TEMPLATES — booking_declined
// ============================================================

function buildDeclinedGuestEmailHtml(data: BookingData): string {
  const lang = pickLang(data.guest_language);
  const t = translations.booking_declined[lang];
  const nights = countNights(data.check_in, data.check_out);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:600">Vilhelmina Lodge</h1>
    <p style="color:#a8c5b4;margin:8px 0 0;font-size:14px">Flightmode Adventures</p>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="color:#1a3a2a;margin:0 0 8px;font-size:20px">${t.greeting}</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">${t.intro}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:8px;margin-bottom:24px">
      <tr><td style="padding:12px 16px;font-weight:600;color:#1a3a2a;border-bottom:1px solid #e8ede9">${t.refLabel}</td><td style="padding:12px 16px;text-align:right;border-bottom:1px solid #e8ede9;color:#1a3a2a">${data.reference}</td></tr>
      <tr><td style="padding:12px 16px;color:#555;border-bottom:1px solid #e8ede9">${t.datesLabel}</td><td style="padding:12px 16px;text-align:right;color:#333;border-bottom:1px solid #e8ede9">${formatDate(data.check_in)} — ${formatDate(data.check_out)} (${nights} ${t.nightsLabel})</td></tr>
      <tr><td style="padding:12px 16px;color:#555">${t.guestsLabel}</td><td style="padding:12px 16px;text-align:right;color:#333">${data.num_guests}</td></tr>
    </table>

    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px">${t.altDates}</p>

    <p style="color:#555;font-size:15px;line-height:1.6;margin:0">${t.closing}</p>
    <p style="color:#1a3a2a;font-weight:600;margin:16px 0 0">${t.team}</p>
  </td></tr>
  <tr><td style="background:#f4f6f9;padding:24px 40px;text-align:center">
    <p style="margin:0;color:#999;font-size:12px">Flightmode Adventures AB — info@flightmode.se</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ============================================================
// SMTP
// ============================================================

async function sendEmail(to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });
  try {
    await client.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      content: "auto",
      html,
    });
  } finally {
    await client.close();
  }
}

// ============================================================
// DATA FETCHER
// ============================================================

async function fetchBookingData(supabase: any, record: any): Promise<BookingData> {
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("*")
    .eq("id", record.guest_id)
    .single();
  if (guestError) throw guestError;

  const { data: bookingAddons, error: addonsError } = await supabase
    .from("booking_addons")
    .select("*, addons(*)")
    .eq("booking_id", record.id);
  if (addonsError) throw addonsError;

  const lang = guest.language || "en";
  const addonsList = (bookingAddons || []).map((ba: any) => ({
    name: ba.addons?.translations?.[lang]?.name || ba.addons?.translations?.en?.name || ba.addons?.slug || "Add-on",
    quantity: ba.quantity,
    total_price: ba.total_price,
    selected_dates: ba.selected_dates || null,
  }));

  return {
    reference: record.reference,
    check_in: record.check_in,
    check_out: record.check_out,
    num_guests: record.num_guests,
    lodge_total: record.lodge_total,
    addons_total: record.addons_total,
    total_price: record.total_price,
    deposit_amount: record.deposit_amount,
    message: record.message,
    guest_name: guest.name,
    guest_email: guest.email,
    guest_language: lang,
    addons: addonsList,
  };
}

// ============================================================
// EVENT HANDLERS
// ============================================================

async function handleBookingReceived(supabase: any, record: any) {
  const data = await fetchBookingData(supabase, record);
  const lang = pickLang(data.guest_language);
  const t = translations.booking_received[lang];

  await sendEmail(data.guest_email, t.subject, buildReceivedGuestEmailHtml(data));
  await sendEmail(ADMIN_EMAIL, `Ny bokning: ${data.reference} — ${data.guest_name}`, buildReceivedAdminEmailHtml(data));

  await supabase.from("email_log").insert([
    { booking_id: record.id, guest_id: record.guest_id, email_type: "booking_received", recipient: data.guest_email, subject: t.subject, status: "sent" },
    { booking_id: record.id, guest_id: record.guest_id, email_type: "booking_received", recipient: ADMIN_EMAIL, subject: `Ny bokning: ${data.reference} — ${data.guest_name}`, status: "sent" },
  ]);

  return { success: true, message: `booking_received emails sent to ${data.guest_email} and ${ADMIN_EMAIL}` };
}

async function handleStatusEmail(supabase: any, eventType: "booking_confirmed" | "booking_declined", bookingId: string) {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings").select("*").eq("id", bookingId).single();
  if (bookingError) throw bookingError;

  const data = await fetchBookingData(supabase, booking);
  const lang = pickLang(data.guest_language);
  const t = translations[eventType][lang];

  const html = eventType === "booking_confirmed"
    ? buildConfirmedGuestEmailHtml(data)
    : buildDeclinedGuestEmailHtml(data);

  await sendEmail(data.guest_email, t.subject, html);

  await supabase.from("email_log").insert([
    { booking_id: bookingId, guest_id: booking.guest_id, email_type: eventType, recipient: data.guest_email, subject: t.subject, status: "sent" },
  ]);

  return { success: true, message: `${eventType} email sent to ${data.guest_email}` };
}

// ============================================================
// MAIN HANDLER — dispatcher baserat på payload-form
// ============================================================

serve(async (req) => {
  // Browser-preflight (CORS) — måste svara 200 utan body
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return jsonResponse({ error: "Empty request body" }, 400);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return jsonResponse({ error: `Invalid JSON: ${(e as Error).message}` }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Form 1: Database Webhook (INSERT på bookings)
    //   { type: 'INSERT', table: 'bookings', record: {...}, ... }
    if (payload.type === "INSERT" && payload.record) {
      const result = await handleBookingReceived(supabase, payload.record);
      return jsonResponse(result);
    }

    // Form 2: Explicit admin-anrop med event_type + booking_id
    //   { event_type: 'booking_confirmed' | 'booking_declined', booking_id: 'uuid' }
    if (payload.event_type && payload.booking_id) {
      if (payload.event_type !== "booking_confirmed" && payload.event_type !== "booking_declined") {
        return jsonResponse({ error: `Unsupported event_type: ${payload.event_type}` }, 400);
      }
      const result = await handleStatusEmail(supabase, payload.event_type, payload.booking_id);
      return jsonResponse(result);
    }

    return jsonResponse({ error: "Invalid payload: expected webhook record or {event_type, booking_id}" }, 400);
  } catch (error) {
    console.error("Error sending booking emails:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
