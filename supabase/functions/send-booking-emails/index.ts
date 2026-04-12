// supabase/functions/send-booking-emails/index.ts
// Triggered via Database Webhook on bookings INSERT
// Sends two emails via Loopia SMTP:
//   1. Confirmation to guest (multi-language)
//   2. Notification to info@flightmode.se

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

// ============================================================
// TRANSLATIONS
// ============================================================
const translations: Record<string, Record<string, string>> = {
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
    step3: "Once the deposit is paid, your booking is secured.",
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
    step3: "När depositionen är betald är din bokning säkrad.",
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
    step3: "Nach Eingang der Anzahlung ist Ihre Buchung gesichert.",
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
    step3: "Une fois l'acompte payé, votre réservation est confirmée.",
    closing: "Nous avons hâte de vous accueillir au Vilhelmina Lodge !",
    team: "L'équipe Flightmode Adventures",
  },
};

// ============================================================
// EMAIL TEMPLATES
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("sv-SE", {
    month: "short",
    day: "numeric",
  });
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
      row += `<tr><td colspan="2" style="padding:2px 12px 8px;color:#888;font-size:12px;font-style:italic;border-bottom:1px solid #eee">\u2192 ${datesStr}</td></tr>`;
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
      row += `<tr><td colspan="2" style="padding:2px 12px 8px;color:#888;font-size:12px;font-style:italic;border-bottom:1px solid #eee">\u2192 ${datesStr}</td></tr>`;
    }
    return row;
  }).join("");
}

function buildGuestEmailHtml(data: BookingData): string {
  const lang = data.guest_language || "en";
  const t = translations[lang] || translations.en;
  const nights = countNights(data.check_in, data.check_out);
  const addonsRows = buildAddonRows(data.addons);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">

  <!-- Header -->
  <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:600">Vilhelmina Lodge</h1>
    <p style="color:#a8c5b4;margin:8px 0 0;font-size:14px">Flightmode Adventures</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px">
    <h2 style="color:#1a3a2a;margin:0 0 8px;font-size:20px">${t.greeting}</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">${t.intro}</p>

    <!-- Booking details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:8px;padding:4px;margin-bottom:24px">
      <tr><td style="padding:12px 16px;font-weight:600;color:#1a3a2a;border-bottom:1px solid #e8ede9">${t.refLabel}</td><td style="padding:12px 16px;text-align:right;border-bottom:1px solid #e8ede9;font-weight:600;color:#1a3a2a;font-size:16px">${data.reference}</td></tr>
      <tr><td style="padding:12px 16px;color:#555;border-bottom:1px solid #e8ede9">${t.datesLabel}</td><td style="padding:12px 16px;text-align:right;color:#333;border-bottom:1px solid #e8ede9">${formatDate(data.check_in)} — ${formatDate(data.check_out)} (${nights} ${t.nightsLabel})</td></tr>
      <tr><td style="padding:12px 16px;color:#555;border-bottom:1px solid #e8ede9">${t.guestsLabel}</td><td style="padding:12px 16px;text-align:right;color:#333;border-bottom:1px solid #e8ede9">${data.num_guests}</td></tr>
    </table>

    <!-- Pricing -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555">${t.lodgeLabel}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatSEK(data.lodge_total)}</td></tr>
      ${addonsRows}
      <tr><td style="padding:10px 12px;font-weight:700;font-size:16px;color:#1a3a2a;border-top:2px solid #1a3a2a">${t.totalLabel}</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;color:#1a3a2a;border-top:2px solid #1a3a2a">${formatSEK(data.total_price)}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">${t.depositLabel}</td><td style="padding:6px 12px;text-align:right;color:#888">${formatSEK(data.deposit_amount)}</td></tr>
    </table>

    ${data.message ? `<div style="background:#f8faf9;border-radius:8px;padding:16px;margin-bottom:24px"><p style="margin:0 0 4px;font-weight:600;color:#1a3a2a;font-size:13px">${t.messageLabel}</p><p style="margin:0;color:#555;font-size:14px;line-height:1.5">${data.message}</p></div>` : ""}

    <!-- Next steps -->
    <h3 style="color:#1a3a2a;margin:0 0 12px;font-size:16px">${t.nextSteps}</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:8px 0;color:#555;font-size:14px;line-height:1.5">
        <span style="display:inline-block;width:24px;height:24px;background:#1a3a2a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;vertical-align:middle">1</span>${t.step1}
      </td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;line-height:1.5">
        <span style="display:inline-block;width:24px;height:24px;background:#1a3a2a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;vertical-align:middle">2</span>${t.step2}
      </td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;line-height:1.5">
        <span style="display:inline-block;width:24px;height:24px;background:#1a3a2a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;vertical-align:middle">3</span>${t.step3}
      </td></tr>
    </table>

    <p style="color:#555;font-size:15px;line-height:1.6;margin:0">${t.closing}</p>
    <p style="color:#1a3a2a;font-weight:600;margin:16px 0 0">${t.team}</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f4f6f9;padding:24px 40px;text-align:center">
    <p style="margin:0;color:#999;font-size:12px">Flightmode Adventures AB — info@flightmode.se</p>
    <p style="margin:4px 0 0;color:#999;font-size:12px">flightmode.se</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function buildAdminEmailHtml(data: BookingData): string {
  const nights = countNights(data.check_in, data.check_out);
  const addonsRows = buildAdminAddonRows(data.addons);

  return `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">

  <!-- Header -->
  <tr><td style="background:#c45a20;padding:24px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">Ny bokningsförfrågan</h1>
    <p style="color:#ffd9c0;margin:4px 0 0;font-size:24px;font-weight:700">${data.reference}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 40px">

    <!-- Guest info -->
    <h3 style="color:#333;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px">Gästinformation</h3>
    <table width="100%" style="margin-bottom:24px;background:#f8f9fa;border-radius:8px">
      <tr><td style="padding:10px 16px;color:#666;width:120px">Namn</td><td style="padding:10px 16px;font-weight:600">${data.guest_name}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">E-post</td><td style="padding:10px 16px"><a href="mailto:${data.guest_email}" style="color:#c45a20">${data.guest_email}</a></td></tr>
      <tr><td style="padding:10px 16px;color:#666">Språk</td><td style="padding:10px 16px">${data.guest_language.toUpperCase()}</td></tr>
    </table>

    <!-- Booking details -->
    <h3 style="color:#333;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px">Bokningsdetaljer</h3>
    <table width="100%" style="margin-bottom:24px;background:#f8f9fa;border-radius:8px">
      <tr><td style="padding:10px 16px;color:#666;width:120px">Incheckning</td><td style="padding:10px 16px;font-weight:600">${formatDate(data.check_in)}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">Utcheckning</td><td style="padding:10px 16px;font-weight:600">${formatDate(data.check_out)}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">Nätter</td><td style="padding:10px 16px">${nights}</td></tr>
      <tr><td style="padding:10px 16px;color:#666">Gäster</td><td style="padding:10px 16px">${data.num_guests}</td></tr>
    </table>

    <!-- Pricing -->
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

  <!-- Footer -->
  <tr><td style="background:#f4f6f9;padding:20px 40px;text-align:center">
    <p style="margin:0;color:#999;font-size:12px">Vilhelmina Lodge Bokningssystem — Flightmode Adventures AB</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ============================================================
// SMTP EMAIL SENDER (Loopia)
// ============================================================

async function sendEmail(to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: {
        username: SMTP_USER,
        password: SMTP_PASS,
      },
    },
  });

  try {
    await client.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });
  } finally {
    await client.close();
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  try {
    // Webhook payload from Supabase
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
      });
    }

    // Use service role to fetch related data
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch guest info
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("*")
      .eq("id", record.guest_id)
      .single();

    if (guestError) throw guestError;

    // Fetch booking addons with addon details
    const { data: bookingAddons, error: addonsError } = await supabase
      .from("booking_addons")
      .select("*, addons(*)")
      .eq("booking_id", record.id);

    if (addonsError) throw addonsError;

    const lang = guest.language || "en";

    // Map addons to localized names, include selected_dates
    const addonsList = (bookingAddons || []).map((ba: any) => ({
      name:
        ba.addons?.translations?.[lang]?.name ||
        ba.addons?.translations?.en?.name ||
        ba.addons?.slug ||
        "Add-on",
      quantity: ba.quantity,
      total_price: ba.total_price,
      selected_dates: ba.selected_dates || null,
    }));

    const bookingData: BookingData = {
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

    // Send both emails sequentially (SMTP connections)
    const t = translations[lang] || translations.en;

    await sendEmail(guest.email, t.subject, buildGuestEmailHtml(bookingData));
    await sendEmail(
      ADMIN_EMAIL,
      `Ny bokning: ${record.reference} — ${guest.name}`,
      buildAdminEmailHtml(bookingData)
    );

    // Log emails in database
    await supabase.from("email_log").insert([
      {
        booking_id: record.id,
        guest_id: guest.id,
        email_type: "booking_received",
        recipient: guest.email,
        subject: t.subject,
        status: "sent",
      },
      {
        booking_id: record.id,
        guest_id: guest.id,
        email_type: "booking_received",
        recipient: ADMIN_EMAIL,
        subject: `Ny bokning: ${record.reference} — ${guest.name}`,
        status: "sent",
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails sent to ${guest.email} and ${ADMIN_EMAIL}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending booking emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
