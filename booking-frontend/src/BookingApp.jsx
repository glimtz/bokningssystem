import React, { createContext, useContext, useReducer, useState, useCallback, useEffect, useMemo } from 'react';
import { createBookingRequest, getAddons as fetchAddons, getBlockedDates, getBookedDates, getSettings, getActiveSeasons } from './api';

const I18nContext = createContext();
const BookingContext = createContext();

const translations = {
  en: {
    header: { title: 'Vilhelmina River Lodge', tagline: '' },
    stepper: { dates: 'Dates', addons: 'Extras', contact: 'Contact', summary: 'Summary' },
    lodge: {
      name: 'Vilhelmina River Lodge',
      description: 'Exclusive lodge by the Vojmån river, north of Vilhelmina. The lodge includes a main cabin, a sleeping cabin, a relaxation & sauna cabin, a grill hut and an outdoor BBQ area.',
      perPersonPerNight: 'per person / night',
      minPrice: 'Minimum {{price}} SEK per night',
      maxGuests: 'Max {{count}} guests',
      features: ['Main cabin', 'Sleeping cabin', 'Sauna & relaxation', 'Grill hut & outdoor BBQ'],
    },
    seasonInfo: {
      title: 'Seasons & prices',
      summer: 'Summer',
      winter: 'Winter',
      summerText: 'The whole lodge from {{lodge}} SEK/night, or the Little Cabin from {{lillstuga}} SEK/night.',
      winterText: 'Whole lodge only, from {{lodge}} SEK/night.',
      perPerson: '{{price}} SEK per person and night, but never less than the minimum price above.',
      perPersonInline: '{{price}} SEK per person and night.',
    },
    rental: {
      title: 'Choose your stay',
      description: 'Book the whole lodge, or just the Little Cabin for smaller groups. Either way, the property is yours alone.',
      lillstugaOnly: 'Bookable {{from}} – {{to}} (summer season). In winter only the whole lodge is rented out.',
      lillstugaClosed: 'Not available for the selected dates — in winter only the whole lodge is rented out.',
      options: {
        full_lodge: {
          name: 'The whole lodge',
          description: 'Exclusive use of the entire property — main cabin, sleeping cabin, sauna & relaxation, grill hut and outdoor BBQ.',
          features: ['Main cabin', 'Sleeping cabin', 'Sauna & relaxation', 'Grill hut & outdoor BBQ'],
        },
        lillstuga: {
          name: 'The Little Cabin',
          description: 'The sleeping cabin with a small kitchen, plus the sauna, relaxation and BBQ areas — you have the whole property to yourselves; the main cabin simply stays closed. Ideal for smaller groups.',
          features: ['Sleeping cabin', 'Sauna & relaxation', 'Grill hut & outdoor BBQ'],
        },
      },
    },
    dates: {
      title: 'Choose your dates',
      description: 'Select check-in and check-out dates, and how many guests are coming.',
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      nights: '{{count}} nights',
      guestCount: 'Number of guests',
      nextBtn: 'Extras',
    },
    addons: {
      title: 'Extras',
      description: 'Add extras to make your experience complete. All extras are optional.',
      nextBtn: 'Contact details',
      prevBtn: 'Dates',
      howManyDays: 'How many days?',
      guideGroupHint: 'Choose a fishing and/or hunting guide.',
      selectWhichDays: 'Select which days',
      day: 'day',
      days: 'days',
      guest: 'guest',
      guests: 'guests',
      perDay: 'per day',
      perPerson: 'per person',
      flatFee: 'Fixed price',
      guideDays: 'Guide days',
      boatDays: 'Boat days',
      items: {
        boat: { name: 'Boat rental', description: 'Alloycraft J370 with 10 hp outboard motor. Trailer included.', unit: 'per day' },
        guide: { name: 'Fishing guide', description: 'Full day with a private fishing guide. Lunch included.', unit: 'per day' },
        guide_hunting: { name: 'Hunting guide', description: 'Full day with a private hunting guide. Lunch included.', unit: 'per day' },
        linens: { name: 'Bed linens & towels', description: 'Fresh bed linens and towels for each guest.', unit: 'per person' },
        cleaning: { name: 'Final cleaning', description: 'Professional cleaning after your stay.', unit: '' },
      },
    },
    contact: {
      title: 'Contact details',
      description: 'Fill in your details and we will get back to you with a confirmation.',
      name: 'Name',
      namePlaceholder: 'Your full name',
      email: 'Email',
      emailPlaceholder: 'your@email.com',
      phone: 'Phone',
      phonePlaceholder: '+46 70 123 45 67',
      message: 'Message / requests',
      messagePlaceholder: 'Allergies, special requests, questions...',
      gdprConsent: 'I consent to the processing of my personal data for this booking request. *',
      marketingConsent: 'I would like to receive news and offers from Flightmode Adventures.',
      nextBtn: 'Review booking request',
      prevBtn: 'Extras',
    },
    summary: {
      title: 'Review your booking request',
      description: 'Check that everything looks correct before sending your booking request.',
      datesAndGuests: 'Dates & guests',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      nights: 'Nights',
      night: 'night',
      nightsPlural: 'nights',
      guests: 'Guests',
      lodge: 'Lodge',
      extras: 'Extras',
      contactDetails: 'Contact details',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      message: 'Message',
      total: 'Total:',
      disclaimer: 'This is a booking request. Final price will be confirmed by Flightmode. A deposit of SEK 3,000–5,000 is due upon confirmed booking.',
      prevBtn: 'Edit',
      submitBtn: 'Send booking request',
      sending: 'Sending...',
      confirmation: {
        title: 'Thank you for your booking request!',
        text: 'We have received your request and will get back to you within 24 hours with a confirmation to',
        contactText: 'Questions? Contact us at',
        newBooking: 'New booking request',
      },
    },
  },
  sv: {
    header: { title: 'Vilhelmina River Lodge', tagline: '' },
    stepper: { dates: 'Datum', addons: 'Tillval', contact: 'Kontakt', summary: 'Sammanfattning' },
    lodge: {
      name: 'Vilhelmina River Lodge',
      description: 'Exklusiv lodge vid Vojmån, norr om Vilhelmina. Lodgen består av en storstuga, en sovstuga, en relax- och bastustuga samt en grillkåta och en utegrillplats.',
      perPersonPerNight: 'per person / natt',
      minPrice: 'Minimum {{price}} SEK per natt',
      maxGuests: 'Max {{count}} gäster',
      features: ['Storstuga', 'Sovstuga', 'Relax & bastu', 'Grillkåta & utegrill'],
    },
    seasonInfo: {
      title: 'Säsonger & priser',
      summer: 'Sommar',
      winter: 'Vinter',
      summerText: 'Hela lodgen från {{lodge}} kr/natt, eller Lillstugan från {{lillstuga}} kr/natt.',
      winterText: 'Endast hela lodgen, från {{lodge}} kr/natt.',
      perPerson: 'Priset är {{price}} kr per person och natt, men lägst minimipriset ovan.',
      perPersonInline: '{{price}} kr per person och natt.',
    },
    rental: {
      title: 'Välj boende',
      description: 'Boka hela lodgen, eller bara Lillstugan för mindre sällskap. Oavsett vilket har ni fastigheten för er själva.',
      lillstugaOnly: 'Kan bokas {{from}} – {{to}} (sommarsäsong). Vintertid hyrs endast hela lodgen ut.',
      lillstugaClosed: 'Går inte att boka för valda datum — vintertid hyrs endast hela lodgen ut.',
      options: {
        full_lodge: {
          name: 'Hela lodgen',
          description: 'Exklusiv tillgång till hela fastigheten — storstuga, sovstuga, bastu & relax samt grillkåta och utegrillplats.',
          features: ['Storstuga', 'Sovstuga', 'Bastu & relax', 'Grillkåta & utegrill'],
        },
        lillstuga: {
          name: 'Lillstugan',
          description: 'Sovstuga med ett litet kök, plus bastu, relax och grillplatserna — ni har hela fastigheten för er själva; storstugan står bara stängd. Perfekt för mindre sällskap.',
          features: ['Lillstugan (sovstuga)', 'Bastu & relax', 'Grillkåta & utegrill'],
        },
      },
    },
    dates: {
      title: 'Välj datum',
      description: 'Välj incheckning, utcheckning och antal gäster.',
      weekdays: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'],
      months: ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'],
      checkIn: 'Incheckning',
      checkOut: 'Utcheckning',
      nights: '{{count}} nätter',
      guestCount: 'Antal gäster',
      nextBtn: 'Tillval',
    },
    addons: {
      title: 'Tillval',
      description: 'Lägg till extras för att göra din upplevelse komplett. Alla tillval är valfria.',
      nextBtn: 'Kontaktuppgifter',
      prevBtn: 'Datum',
      howManyDays: 'Hur många dagar?',
      guideGroupHint: 'Välj fiske- och/eller jaktguide.',
      selectWhichDays: 'Välj vilka dagar',
      day: 'dag',
      days: 'dagar',
      guest: 'gäst',
      guests: 'gäster',
      perDay: 'per dag',
      perPerson: 'per person',
      flatFee: 'Fast pris',
      guideDays: 'Guidedagar',
      boatDays: 'Båtdagar',
      items: {
        boat: { name: 'Båthyra', description: 'Alloycraft J370 med 10 hk utombordsmotor. Trailer ingår.', unit: 'per dag' },
        guide: { name: 'Fiskeguide', description: 'Heldag med privat fiskeguide. Lunch ingår.', unit: 'per dag' },
        guide_hunting: { name: 'Jaktguide', description: 'Heldag med privat jaktguide. Lunch ingår.', unit: 'per dag' },
        linens: { name: 'Sänglinnen & handdukar', description: 'Fräscha sänglinnen och handdukar för varje gäst.', unit: 'per person' },
        cleaning: { name: 'Slutstädning', description: 'Professionell städning efter er vistelse.', unit: '' },
      },
    },
    contact: {
      title: 'Kontaktuppgifter',
      description: 'Fyll i dina uppgifter så kontaktar vi dig med en bekräftelse.',
      name: 'Namn',
      namePlaceholder: 'Ditt fullständiga namn',
      email: 'E-post',
      emailPlaceholder: 'din@epost.se',
      phone: 'Telefon',
      phonePlaceholder: '070-123 45 67',
      message: 'Meddelande / önskemål',
      messagePlaceholder: 'Allergier, specialönskemål, frågor...',
      gdprConsent: 'Jag samtycker till behandling av mina personuppgifter för denna bokningsförfrågan. *',
      marketingConsent: 'Jag vill gärna ta emot nyheter och erbjudanden från Flightmode Adventures.',
      nextBtn: 'Granska bokningsförfrågan',
      prevBtn: 'Tillval',
    },
    summary: {
      title: 'Granska din bokningsförfrågan',
      description: 'Kontrollera att allt stämmer innan du skickar din bokningsförfrågan.',
      datesAndGuests: 'Datum & gäster',
      checkIn: 'Incheckning',
      checkOut: 'Utcheckning',
      nights: 'Antal nätter',
      night: 'natt',
      nightsPlural: 'nätter',
      guests: 'Antal gäster',
      lodge: 'Lodge',
      extras: 'Tillval',
      contactDetails: 'Kontaktuppgifter',
      name: 'Namn',
      email: 'E-post',
      phone: 'Telefon',
      message: 'Meddelande',
      total: 'Totalt:',
      disclaimer: 'Detta är en bokningsförfrågan. Slutgiltigt pris bekräftas av Flightmode. En deposition på 3 000–5 000 SEK betalas vid bekräftad bokning.',
      prevBtn: 'Ändra',
      submitBtn: 'Skicka bokningsförfrågan',
      sending: 'Skickar...',
      confirmation: {
        title: 'Tack för din bokningsförfrågan!',
        text: 'Vi har tagit emot din förfrågan och återkommer inom 24 timmar med en bekräftelse till',
        contactText: 'Har du frågor? Kontakta oss på',
        newBooking: 'Ny bokningsförfrågan',
      },
    },
  },
  de: {
    header: { title: 'Vilhelmina River Lodge', tagline: '' },
    stepper: { dates: 'Datum', addons: 'Extras', contact: 'Kontakt', summary: 'Zusammenfassung' },
    lodge: {
      name: 'Vilhelmina River Lodge',
      description: 'Exklusive Lodge am Fluss Vojmån, nördlich von Vilhelmina. Die Lodge umfasst eine Haupthütte, eine Schlafhütte, eine Entspannungs- & Saunahütte sowie eine Grillkota und einen Außengrillplatz.',
      perPersonPerNight: 'pro Person / Nacht',
      minPrice: 'Mindestpreis {{price}} SEK pro Nacht',
      maxGuests: 'Max. {{count}} Gäste',
      features: ['Haupthütte', 'Schlafhütte', 'Entspannung & Sauna', 'Grillkota & Außengrill'],
    },
    seasonInfo: {
      title: 'Saisons & Preise',
      summer: 'Sommer',
      winter: 'Winter',
      summerText: 'Die gesamte Lodge ab {{lodge}} SEK/Nacht oder die kleine Hütte ab {{lillstuga}} SEK/Nacht.',
      winterText: 'Nur die gesamte Lodge, ab {{lodge}} SEK/Nacht.',
      perPerson: '{{price}} SEK pro Person und Nacht, mindestens jedoch der oben genannte Mindestpreis.',
      perPersonInline: '{{price}} SEK pro Person und Nacht.',
    },
    rental: {
      title: 'Unterkunft wählen',
      description: 'Buchen Sie die ganze Lodge oder nur die kleine Hütte für kleinere Gruppen. In beiden Fällen haben Sie das Anwesen für sich allein.',
      lillstugaOnly: 'Buchbar {{from}} – {{to}} (Sommersaison). Im Winter wird nur die gesamte Lodge vermietet.',
      lillstugaClosed: 'Für die gewählten Daten nicht buchbar — im Winter wird nur die gesamte Lodge vermietet.',
      options: {
        full_lodge: {
          name: 'Die ganze Lodge',
          description: 'Exklusive Nutzung des gesamten Anwesens — Haupthütte, Schlafhütte, Sauna & Entspannung, Grillkota und Außengrillplatz.',
          features: ['Haupthütte', 'Schlafhütte', 'Sauna & Entspannung', 'Grillkota & Außengrill'],
        },
        lillstuga: {
          name: 'Die kleine Hütte',
          description: 'Die Schlafhütte mit einer kleinen Küche, samt Sauna, Entspannung und Grillplätzen — Sie haben das gesamte Anwesen für sich allein; die Haupthütte bleibt einfach geschlossen. Ideal für kleinere Gruppen.',
          features: ['Schlafhütte', 'Sauna & Entspannung', 'Grillkota & Außengrill'],
        },
      },
    },
    dates: {
      title: 'Wählen Sie Ihre Daten',
      description: 'Wählen Sie An- und Abreisedatum sowie die Anzahl der Gäste.',
      weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      checkIn: 'Anreise',
      checkOut: 'Abreise',
      nights: '{{count}} Nächte',
      guestCount: 'Anzahl der Gäste',
      nextBtn: 'Extras',
    },
    addons: {
      title: 'Extras',
      description: 'Fügen Sie Extras hinzu, um Ihr Erlebnis zu vervollständigen. Alle Extras sind optional.',
      nextBtn: 'Kontaktdaten',
      prevBtn: 'Datum',
      howManyDays: 'Wie viele Tage?',
      guideGroupHint: 'Wählen Sie einen Angel- und/oder Jagdguide.',
      selectWhichDays: 'Tage auswählen',
      day: 'Tag',
      days: 'Tage',
      guest: 'Gast',
      guests: 'Gäste',
      perDay: 'pro Tag',
      perPerson: 'pro Person',
      flatFee: 'Festpreis',
      guideDays: 'Guidetage',
      boatDays: 'Bootstage',
      items: {
        boat: { name: 'Bootsverleih', description: 'Alloycraft J370 mit 10-PS-Außenbordmotor. Trailer inklusive.', unit: 'pro Tag' },
        guide: { name: 'Angel-Guide', description: 'Ganztägig mit privatem Angel-Guide. Mittagessen inklusive.', unit: 'pro Tag' },
        guide_hunting: { name: 'Jagdguide', description: 'Ganztägig mit privatem Jagdguide. Mittagessen inklusive.', unit: 'pro Tag' },
        linens: { name: 'Bettwäsche & Handtücher', description: 'Frische Bettwäsche und Handtücher für jeden Gast.', unit: 'pro Person' },
        cleaning: { name: 'Endreinigung', description: 'Professionelle Reinigung nach Ihrem Aufenthalt.', unit: '' },
      },
    },
    contact: {
      title: 'Kontaktdaten',
      description: 'Geben Sie Ihre Daten ein und wir melden uns mit einer Bestätigung bei Ihnen.',
      name: 'Name',
      namePlaceholder: 'Ihr vollständiger Name',
      email: 'E-Mail',
      emailPlaceholder: 'ihre@email.de',
      phone: 'Telefon',
      phonePlaceholder: '+49 170 123 45 67',
      message: 'Nachricht / Wünsche',
      messagePlaceholder: 'Allergien, Sonderwünsche, Fragen...',
      gdprConsent: 'Ich stimme der Verarbeitung meiner personenbezogenen Daten für diese Buchungsanfrage zu. *',
      marketingConsent: 'Ich möchte Neuigkeiten und Angebote von Flightmode Adventures erhalten.',
      nextBtn: 'Buchungsanfrage überprüfen',
      prevBtn: 'Extras',
    },
    summary: {
      title: 'Überprüfen Sie Ihre Buchungsanfrage',
      description: 'Prüfen Sie, ob alles stimmt, bevor Sie Ihre Buchungsanfrage absenden.',
      datesAndGuests: 'Daten & Gäste',
      checkIn: 'Anreise',
      checkOut: 'Abreise',
      nights: 'Nächte',
      night: 'Nacht',
      nightsPlural: 'Nächte',
      guests: 'Gäste',
      lodge: 'Lodge',
      extras: 'Extras',
      contactDetails: 'Kontaktdaten',
      name: 'Name',
      email: 'E-Mail',
      phone: 'Telefon',
      message: 'Nachricht',
      total: 'Gesamt:',
      disclaimer: 'Dies ist eine Buchungsanfrage. Der Endpreis wird von Flightmode bestätigt. Eine Anzahlung von 3.000–5.000 SEK ist bei bestätigter Buchung fällig.',
      prevBtn: 'Bearbeiten',
      submitBtn: 'Buchungsanfrage senden',
      sending: 'Wird gesendet...',
      confirmation: {
        title: 'Vielen Dank für Ihre Buchungsanfrage!',
        text: 'Wir haben Ihre Anfrage erhalten und melden uns innerhalb von 24 Stunden mit einer Bestätigung an',
        contactText: 'Fragen? Kontaktieren Sie uns unter',
        newBooking: 'Neue Buchungsanfrage',
      },
    },
  },
  fr: {
    header: { title: 'Vilhelmina River Lodge', tagline: '' },
    stepper: { dates: 'Dates', addons: 'Options', contact: 'Contact', summary: 'Résumé' },
    lodge: {
      name: 'Vilhelmina River Lodge',
      description: 'Lodge exclusive au bord de la rivière Vojmån, au nord de Vilhelmina. Le lodge comprend un chalet principal, un chalet de couchage, un chalet détente & sauna, une hutte-barbecue et un espace barbecue extérieur.',
      perPersonPerNight: 'par personne / nuit',
      minPrice: 'Minimum {{price}} SEK par nuit',
      maxGuests: 'Max. {{count}} personnes',
      features: ['Chalet principal', 'Chalet de couchage', 'Détente & sauna', 'Hutte-barbecue & barbecue ext.'],
    },
    seasonInfo: {
      title: 'Saisons & tarifs',
      summer: 'Été',
      winter: 'Hiver',
      summerText: 'Le lodge entier à partir de {{lodge}} SEK/nuit, ou le petit chalet à partir de {{lillstuga}} SEK/nuit.',
      winterText: 'Uniquement le lodge entier, à partir de {{lodge}} SEK/nuit.',
      perPerson: '{{price}} SEK par personne et par nuit, avec au minimum le prix plancher ci-dessus.',
      perPersonInline: '{{price}} SEK par personne et par nuit.',
    },
    rental: {
      title: 'Choisissez votre séjour',
      description: 'Réservez tout le lodge, ou seulement le petit chalet pour les petits groupes. Dans les deux cas, la propriété est rien que pour vous.',
      lillstugaOnly: 'Réservable du {{from}} au {{to}} (saison d’été). En hiver, seul le lodge entier est loué.',
      lillstugaClosed: 'Non disponible pour les dates choisies — en hiver, seul le lodge entier est loué.',
      options: {
        full_lodge: {
          name: 'Tout le lodge',
          description: 'Usage exclusif de toute la propriété — chalet principal, chalet de couchage, sauna & détente, hutte-barbecue et espace barbecue extérieur.',
          features: ['Chalet principal', 'Chalet de couchage', 'Sauna & détente', 'Hutte-barbecue & barbecue ext.'],
        },
        lillstuga: {
          name: 'Le petit chalet',
          description: 'Le chalet de couchage avec une petite cuisine, plus le sauna, la détente et les espaces barbecue — vous avez toute la propriété rien que pour vous ; le chalet principal reste simplement fermé. Idéal pour les petits groupes.',
          features: ['Chalet de couchage', 'Sauna & détente', 'Hutte-barbecue & barbecue ext.'],
        },
      },
    },
    dates: {
      title: 'Choisissez vos dates',
      description: "Sélectionnez les dates d'arrivée et de départ ainsi que le nombre de personnes.",
      weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      checkIn: 'Arrivée',
      checkOut: 'Départ',
      nights: '{{count}} nuits',
      guestCount: 'Nombre de personnes',
      nextBtn: 'Options',
    },
    addons: {
      title: 'Options',
      description: 'Ajoutez des options pour compléter votre expérience. Toutes les options sont facultatives.',
      nextBtn: 'Coordonnées',
      prevBtn: 'Dates',
      howManyDays: 'Combien de jours ?',
      guideGroupHint: 'Choisissez un guide de pêche et/ou de chasse.',
      selectWhichDays: 'Sélectionnez les jours',
      day: 'jour',
      days: 'jours',
      guest: 'personne',
      guests: 'personnes',
      perDay: 'par jour',
      perPerson: 'par personne',
      flatFee: 'Prix fixe',
      guideDays: 'Jours de guide',
      boatDays: 'Jours de bateau',
      items: {
        boat: { name: 'Location de bateau', description: 'Alloycraft J370 avec moteur hors-bord 10 CV. Remorque incluse.', unit: 'par jour' },
        guide: { name: 'Guide de pêche', description: 'Journée complète avec un guide de pêche privé. Déjeuner inclus.', unit: 'par jour' },
        guide_hunting: { name: 'Guide de chasse', description: 'Journée complète avec guide de chasse privé. Déjeuner inclus.', unit: 'par jour' },
        linens: { name: 'Draps & serviettes', description: 'Draps et serviettes propres pour chaque personne.', unit: 'par personne' },
        cleaning: { name: 'Ménage final', description: 'Nettoyage professionnel après votre séjour.', unit: '' },
      },
    },
    contact: {
      title: 'Coordonnées',
      description: 'Remplissez vos coordonnées et nous vous recontacterons avec une confirmation.',
      name: 'Nom',
      namePlaceholder: 'Votre nom complet',
      email: 'E-mail',
      emailPlaceholder: 'votre@email.fr',
      phone: 'Téléphone',
      phonePlaceholder: '+33 6 12 34 56 78',
      message: 'Message / demandes',
      messagePlaceholder: 'Allergies, demandes spéciales, questions...',
      gdprConsent: 'Je consens au traitement de mes données personnelles pour cette demande de réservation. *',
      marketingConsent: 'Je souhaite recevoir des nouvelles et des offres de Flightmode Adventures.',
      nextBtn: 'Vérifier la demande de réservation',
      prevBtn: 'Options',
    },
    summary: {
      title: 'Vérifiez votre demande de réservation',
      description: "Vérifiez que tout est correct avant d'envoyer votre demande de réservation.",
      datesAndGuests: 'Dates & personnes',
      checkIn: 'Arrivée',
      checkOut: 'Départ',
      nights: 'Nuits',
      night: 'nuit',
      nightsPlural: 'nuits',
      guests: 'Personnes',
      lodge: 'Lodge',
      extras: 'Options',
      contactDetails: 'Coordonnées',
      name: 'Nom',
      email: 'E-mail',
      phone: 'Téléphone',
      message: 'Message',
      total: 'Total :',
      disclaimer: "Ceci est une demande de réservation. Le prix final sera confirmé par Flightmode. Un acompte de 3 000 à 5 000 SEK est dû lors de la confirmation.",
      prevBtn: 'Modifier',
      submitBtn: 'Envoyer la demande de réservation',
      sending: 'Envoi en cours...',
      confirmation: {
        title: 'Merci pour votre demande de réservation !',
        text: 'Nous avons reçu votre demande et reviendrons vers vous dans les 24 heures avec une confirmation à',
        contactText: 'Des questions ? Contactez-nous à',
        newBooking: 'Nouvelle demande de réservation',
      },
    },
  },
};

// Boendealternativ (id:n) — måste matcha bookings.rental_option i databasen.
const RENTAL_OPTIONS = ['lillstuga', 'full_lodge'];

// Bygg konfiguration för de två boendealternativen utifrån settings.
// Båda använder samma pris/person; de skiljer sig i golvpris och max antal gäster.
//   full_lodge = hela lodgen (golv 4000, max 8)
//   lillstuga  = endast Lillstugan (golv 2000, max 4)
// ── Säsonger ─────────────────────────────────────────────
// En dag är bokningsbar om den ligger inom någon aktiv säsongs [start_date, end_date].
// Priser (lodge/deposition/tillval) tas från säsongen som innehåller incheckningsdatumet.
const parseSeasonDate = (str) => str ? new Date(String(str).substring(0, 10) + 'T00:00:00') : null;

const seasonForDate = (seasons, date) => {
  if (!seasons || !seasons.length || !date) return null;
  const d = (date instanceof Date) ? date : parseSeasonDate(date);
  if (!d) return null;
  return seasons.find(s => {
    const start = parseSeasonDate(s.start_date), end = parseSeasonDate(s.end_date);
    return start && end && d >= start && d <= end;
  }) || null;
};

const dateInAnySeason = (seasons, date) => {
  if (!seasons || !seasons.length) {
    // Fallback om inga säsonger är konfigurerade: gamla maj–sep-regeln, så sajten inte dör.
    const m = date.getMonth();
    return m >= 4 && m <= 8;
  }
  return !!seasonForDate(seasons, date);
};

const earliestSeason = (seasons) => {
  if (!seasons || !seasons.length) return null;
  return [...seasons].sort((a, b) => parseSeasonDate(a.start_date) - parseSeasonDate(b.start_date))[0];
};

// Säsong att visa priser för innan datum valts: pågående säsong, annars närmast kommande.
const currentOrNextSeason = (seasons, today) => {
  if (!seasons || !seasons.length) return null;
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return seasonForDate(seasons, t0)
    || [...seasons].filter(s => parseSeasonDate(s.start_date) > t0).sort((a, b) => parseSeasonDate(a.start_date) - parseSeasonDate(b.start_date))[0]
    || earliestSeason(seasons);
};

// Lillstugan kan stängas av per säsong via prices.lillstuga_available = false (t.ex. vintersäsongen,
// då bara hela lodgen hyrs ut). Saknas flaggan går Lillstugan att boka.
const lillstugaAllowedIn = (season) => !season || !season.prices || season.prices.lillstuga_available !== false;

// Får natten bokas med valt boende? Hela lodgen: alltid (inom säsong). Lillstugan: bara i säsonger som tillåter den.
const nightAllowedFor = (seasons, date, rentalOption) =>
  rentalOption !== 'lillstuga' || !seasons || !seasons.length || lillstugaAllowedIn(seasonForDate(seasons, date));

// Närmaste säsong (som inte redan passerat) där Lillstugan går att boka.
const nextLillstugaSeason = (seasons, from) => {
  if (!seasons || !seasons.length) return null;
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return seasons.filter(s => lillstugaAllowedIn(s) && parseSeasonDate(s.end_date) >= f)
    .sort((a, b) => parseSeasonDate(a.start_date) - parseSeasonDate(b.start_date))[0] || null;
};

// Slå ihop säsongens priser över globala settings så befintliga helpers automatiskt får rätt belopp.
const seasonSettings = (base, season) => {
  const p = season && season.prices;
  if (!p) return base;
  const merged = { ...base };
  for (const k of ['price_per_person_per_night', 'min_price_per_night', 'lillstuga_min_price_per_night', 'lillstuga_cleaning_price', 'deposit_amount']) {
    if (p[k] != null) merged[k] = p[k];
  }
  return merged;
};

// Överskrid varje tillvals pris med säsongens pris (per slug), om satt.
const applySeasonAddonPrices = (dbAddons, season) => {
  const ap = season && season.prices && season.prices.addons;
  if (!ap) return dbAddons;
  return (dbAddons || []).map(a => (ap[a.slug] != null ? { ...a, price: ap[a.slug] } : a));
};

// Startvy för kalendern: månaden för säsongen som innehåller idag, annars närmaste kommande säsong.
const initialCalendarView = (seasons, today) => {
  const list = (seasons || []).map(s => ({ start: parseSeasonDate(s.start_date), end: parseSeasonDate(s.end_date) }))
    .filter(s => s.start && s.end).sort((a, b) => a.start - b.start);
  if (!list.length) return { year: today.getFullYear(), month: today.getMonth() >= 4 ? today.getMonth() : 4 };
  const cur = list.find(s => today >= s.start && today <= s.end);
  if (cur) return { year: today.getFullYear(), month: today.getMonth() };
  const upcoming = list.find(s => s.start > today);
  const target = (upcoming || list[0]).start;
  return { year: target.getFullYear(), month: target.getMonth() };
};

const getRentalOptions = (settings) => {
  const perPerson = parseInt(settings.price_per_person_per_night) || 950;
  return {
    full_lodge: {
      id: 'full_lodge',
      maxGuests: parseInt(settings.max_guests) || 8,
      pricePerPersonPerNight: perPerson,
      minPricePerNight: parseInt(settings.min_price_per_night) || 4000,
    },
    lillstuga: {
      id: 'lillstuga',
      maxGuests: parseInt(settings.lillstuga_max_guests) || 4,
      pricePerPersonPerNight: perPerson,
      minPricePerNight: parseInt(settings.lillstuga_min_price_per_night) || 2000,
    },
  };
};

// Konfiguration för det valda boendet (default: hela lodgen).
const getLodgeConfig = (settings, rentalOption = 'full_lodge') => {
  const opts = getRentalOptions(settings);
  return opts[rentalOption] || opts.full_lodge;
};

const getLodgePricePerNight = (gc, lodge) => Math.max(lodge.pricePerPersonPerNight * gc, lodge.minPricePerNight);

// Helper to build addons list from DB addons (with fallback)
const getAddonsList = (dbAddons, rentalOption = 'full_lodge', settings = {}) => {
  // Städning kostar mindre om man bara hyr Lillstugan (mindre yta att städa).
  const cleaningPrice = parseInt(settings.lillstuga_cleaning_price) || 700;
  const adjust = (a) => (a.id === 'cleaning' && rentalOption === 'lillstuga') ? { ...a, price: cleaningPrice } : a;
  if (!dbAddons || dbAddons.length === 0) {
    return [
      { id: 'boat', name: 'Boat rental', price: 1000, type: 'perDay' },
      { id: 'guide', name: 'Fishing guide', price: 8000, type: 'perDay' },
      { id: 'guide_hunting', name: 'Hunting guide', price: 8000, type: 'perDay' },
      { id: 'linens', name: 'Bed linens & towels', price: 150, type: 'perPerson' },
      { id: 'cleaning', name: 'Final cleaning', price: 1200, type: 'flat' },
    ].map(adjust);
  }
  const typeMap = { per_day: 'perDay', per_person: 'perPerson', flat: 'flat' };
  return dbAddons.filter(a => a.is_active).map(a => ({
    id: a.slug,
    name: a.translations?.en?.name || a.slug,
    price: a.price,
    type: typeMap[a.price_type] || a.price_type,
  })).map(adjust);
};

const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

const I18nProvider = ({ children, lang }) => {
  const t = useCallback((key, vars = {}) => {
    const keys = key.split('.');
    let value = translations[lang] || translations.en;
    for (const k of keys) { value = value[k]; if (!value) return key; }
    if (typeof value === 'string' && vars) return value.replace(/\{\{(\w+)\}\}/g, (_, vn) => vars[vn] || '');
    return value;
  }, [lang]);
  return <I18nContext.Provider value={{ t, lang }}>{children}</I18nContext.Provider>;
};

const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};

const initialState = {
  currentStep: 0,
  rentalOption: 'full_lodge',   // 'full_lodge' | 'lillstuga'
  dates: { checkIn: null, checkOut: null },
  addons: { boat: { selected: false, days: 0, selectedDates: [] }, guide: { selected: false, days: 0, selectedDates: [] }, guide_hunting: { selected: false, days: 0, selectedDates: [] }, linens: { selected: false }, cleaning: { selected: false } },
  guests: { count: 2, name: '', email: '', phone: '', message: '', gdprConsent: false, marketingConsent: false },
  dbAddons: [],       // Addons loaded from Supabase (with UUIDs)
  blockedDates: [],   // Blocked dates from Supabase
  bookedDates: [],    // Booked date ranges from Supabase
  settings: {},       // Settings from Supabase
  seasons: [],        // Aktiva säsonger (med priser) från Supabase
  submittedRef: null,  // Booking reference after successful submit
};

const bookingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STEP': return { ...state, currentStep: action.payload };
    case 'SET_RENTAL_OPTION': {
      const rentalOption = action.payload;
      const opts = getRentalOptions(state.settings);
      const max = (opts[rentalOption] || opts.full_lodge).maxGuests;
      // Klampa antal gäster om det nya alternativet rymmer färre.
      const count = Math.min(state.guests.count, max);
      return { ...state, rentalOption, guests: { ...state.guests, count } };
    }
    case 'NEXT_STEP': return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP': return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case 'SET_DATES': {
      // Nollställ dagar/valda datum för alla dag-baserade tillval (de som har selectedDates)
      const addons = {};
      for (const key of Object.keys(state.addons)) {
        const a = state.addons[key];
        addons[key] = ('selectedDates' in a) ? { ...a, days: 0, selectedDates: [] } : a;
      }
      return { ...state, dates: action.payload, addons };
    }
    case 'TOGGLE_ADDON': {
      const id = action.payload, curr = state.addons[id];
      if (curr.selected) {
        const reset = { selected: false };
        if ('days' in curr) reset.days = 0;
        if ('selectedDates' in curr) reset.selectedDates = [];
        return { ...state, addons: { ...state.addons, [id]: reset } };
      }
      const on = { ...curr, selected: true };
      if ('days' in curr) on.days = 1;
      return { ...state, addons: { ...state.addons, [id]: on } };
    }
    case 'SET_ADDON_DAYS': {
      const { addonId, days } = action.payload, addon = state.addons[addonId], update = { ...addon, days };
      if (addon.selectedDates) {
        update.selectedDates = addon.selectedDates.slice(0, days);
      }
      return { ...state, addons: { ...state.addons, [addonId]: update } };
    }
    case 'SET_ADDON_DATES': { const { addonId, dates } = action.payload; return { ...state, addons: { ...state.addons, [addonId]: { ...state.addons[addonId], selectedDates: dates } } }; }
    case 'SET_GUESTS': return { ...state, guests: { ...state.guests, ...action.payload } };
    case 'SET_DB_ADDONS': return { ...state, dbAddons: action.payload };
    case 'SET_BLOCKED_DATES': return { ...state, blockedDates: action.payload };
    case 'SET_BOOKED_DATES': return { ...state, bookedDates: action.payload };
    case 'SET_SETTINGS': return { ...state, settings: action.payload };
    case 'SET_SEASONS': return { ...state, seasons: action.payload };
    case 'SET_SUBMITTED_REF': return { ...state, submittedRef: action.payload };
    case 'RESET': return { ...initialState, dbAddons: state.dbAddons, blockedDates: state.blockedDates, bookedDates: state.bookedDates, settings: state.settings, seasons: state.seasons };
    default: return state;
  }
};

const BookingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dbAddons, blocked, booked, settings, seasons] = await Promise.all([
          fetchAddons(),
          getBlockedDates(),
          getBookedDates(),
          getSettings(),
          getActiveSeasons(),
        ]);
        dispatch({ type: 'SET_DB_ADDONS', payload: dbAddons });
        dispatch({ type: 'SET_BLOCKED_DATES', payload: blocked });
        dispatch({ type: 'SET_BOOKED_DATES', payload: booked });
        dispatch({ type: 'SET_SETTINGS', payload: settings });
        dispatch({ type: 'SET_SEASONS', payload: seasons });
      } catch (err) {
        console.error('Failed to load booking data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--fm-text-muted)' }}>Loading...</div>;
  }

  return <BookingContext.Provider value={{ state, dispatch }}>{children}</BookingContext.Provider>;
};

const StepDates = () => {
  const { state, dispatch } = useBooking();
  const { t, lang } = useI18n();
  const today = new Date();
  // Priser tas från säsongen som innehåller incheckningsdatumet; innan datum valts
  // visas närmaste aktiva säsongs priser på boendekorten.
  const priceSeason = seasonForDate(state.seasons, state.dates.checkIn) || currentOrNextSeason(state.seasons, today);
  const effSettings = seasonSettings(state.settings, priceSeason);
  // Lillstugans priser: från säsongen ovan om den tillåter Lillstugan, annars närmast kommande som gör det.
  const lsSeason = lillstugaAllowedIn(priceSeason) ? priceSeason : (nextLillstugaSeason(state.seasons, state.dates.checkIn || today) || priceSeason);
  const lsSettings = seasonSettings(state.settings, lsSeason);
  const lodge = getLodgeConfig(state.rentalOption === 'lillstuga' ? lsSettings : effSettings, state.rentalOption);
  const initialView = initialCalendarView(state.seasons, today);
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const months = t('dates.months'), weekdays = t('dates.weekdays'), { checkIn, checkOut } = state.dates;

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
  const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const formatDate = (date) => !date ? '—' : `${date.getDate()} ${months[date.getMonth()]}`;

  // Build a Set of occupied NIGHTS (check_in through check_out - 1).
  // The check_out day itself is free — same-day changeover is allowed:
  // a departing guest leaves in the morning, the next guest arrives in the afternoon.
  const bookedNights = useMemo(() => {
    const nights = new Set();
    (state.bookedDates || []).forEach(({ check_in, check_out }) => {
      const start = new Date(check_in + 'T00:00:00');
      const end = new Date(check_out + 'T00:00:00');
      const d = new Date(start);
      while (d < end) {
        nights.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        d.setDate(d.getDate() + 1);
      }
    });
    return nights;
  }, [state.bookedDates]);

  const isBookedNight = (date) => bookedNights.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);

  // Manuellt blockerade datum från admin (blocked_dates) — array av 'YYYY-MM-DD'.
  const blockedSet = useMemo(() => {
    const s = new Set();
    (state.blockedDates || []).forEach(dstr => {
      if (!dstr) return;
      const d = new Date(dstr.substring(0, 10) + 'T00:00:00');
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [state.blockedDates]);
  const isBlocked = (date) => blockedSet.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);

  // Otillgänglig dag = bokad natt ELLER manuellt blockerad
  const isUnavailable = (date) => isBookedNight(date) || isBlocked(date);

  // Natten är stängd för valt boende (Lillstugan i en säsong där bara hela lodgen hyrs ut).
  const isClosedFor = (date) => !nightAllowedFor(state.seasons, date, state.rentalOption);

  // Check if a range from checkIn to a candidate checkOut crosses any unavailable night
  const rangeHasConflict = (from, to) => {
    const d = new Date(from);
    d.setDate(d.getDate() + 1); // first night after check-in
    while (d < to) {
      if (isUnavailable(d) || isClosedFor(d)) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  };

  const handleDayClick = (day) => {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!checkIn || (checkIn && checkOut)) {
      // Selecting check-in: allowed if the night is not booked
      if (isUnavailable(clicked) || isClosedFor(clicked)) return;
      dispatch({ type: 'SET_DATES', payload: { checkIn: clicked, checkOut: null } });
    } else {
      if (clicked > checkIn) {
        // Selecting check-out: reject if range crosses booked nights
        if (rangeHasConflict(checkIn, clicked)) return;
        dispatch({ type: 'SET_DATES', payload: { checkIn, checkOut: clicked } });
      } else {
        if (isUnavailable(clicked) || isClosedFor(clicked)) return;
        dispatch({ type: 'SET_DATES', payload: { checkIn: clicked, checkOut: null } });
      }
    }
  };

  // Stängd dag för valt boende — utom när den är en giltig utcheckningsdag (sista natten ligger före den).
  const isClosedDay = (date) => isClosedFor(date) && !(checkIn && !checkOut && date > checkIn && !rangeHasConflict(checkIn, date));

  const daysInMonth = getDaysInMonth(viewYear, viewMonth), firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const getDayClass = (day) => {
    const date = new Date(viewYear, viewMonth, day), classes = ['calendar-day'];
    if (isSameDay(date, today)) classes.push('today');
    if (date < today || !dateInAnySeason(state.seasons, date) || isClosedDay(date)) { classes.push('disabled'); return classes.join(' '); }
    if (isUnavailable(date)) { classes.push('booked'); return classes.join(' '); }
    if (isSameDay(date, checkIn)) { classes.push('selected'); if (checkOut) classes.push('range-start'); } else if (isSameDay(date, checkOut)) {
      classes.push('selected', 'range-end');
    } else if (checkIn && checkOut && date > checkIn && date < checkOut) { classes.push('in-range'); }
    return classes.join(' ');
  };

  const nightCount = checkIn && checkOut ? Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)) : 0, canProceed = checkIn && checkOut && nightCount > 0;
  const fmt = (n) => new Intl.NumberFormat('sv-SE').format(n);
  const rentalOptions = { ...getRentalOptions(effSettings), lillstuga: getRentalOptions(lsSettings).lillstuga };

  // Lillstugan spärras om valda nätter ligger i en säsong utan Lillstugan, eller om ingen kommande säsong tillåter den.
  const datesBlockLillstuga = (() => {
    if (!checkIn) return false;
    const end = checkOut || new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + 1);
    const d = new Date(checkIn);
    while (d < end) { if (!nightAllowedFor(state.seasons, d, 'lillstuga')) return true; d.setDate(d.getDate() + 1); }
    return false;
  })();
  const lillstugaDisabled = datesBlockLillstuga || (!lillstugaAllowedIn(priceSeason) && !nextLillstugaSeason(state.seasons, today));
  useEffect(() => {
    if (lillstugaDisabled && state.rentalOption === 'lillstuga') dispatch({ type: 'SET_RENTAL_OPTION', payload: 'full_lodge' });
  }, [lillstugaDisabled, state.rentalOption, dispatch]);
  const seasonDateFmt = new Intl.DateTimeFormat({ sv: 'sv-SE', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[lang] || 'en-GB', { day: 'numeric', month: 'long' });
  // ── Rutan "Säsonger & priser": närmaste sommar (Lillstugan tillåten) och närmaste vinter (endast hela lodgen) ──
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const summerSeason = nextLillstugaSeason(state.seasons, today);
  const winterSeason = (state.seasons || []).filter(s => !lillstugaAllowedIn(s) && parseSeasonDate(s.end_date) >= todayStart)
    .sort((a, b) => parseSeasonDate(a.start_date) - parseSeasonDate(b.start_date))[0] || null;
  const infoRows = [
    summerSeason && { key: 'summer', season: summerSeason, o: getRentalOptions(seasonSettings(state.settings, summerSeason)) },
    winterSeason && { key: 'winter', season: winterSeason, o: getRentalOptions(seasonSettings(state.settings, winterSeason)) },
  ].filter(Boolean).sort((a, b) => parseSeasonDate(a.season.start_date) - parseSeasonDate(b.season.start_date));
  const samePerPerson = infoRows.length > 0 && infoRows.every(r => r.o.full_lodge.pricePerPersonPerNight === infoRows[0].o.full_lodge.pricePerPersonPerNight);
  const fmtSeasonRange = (season) => `${seasonDateFmt.format(parseSeasonDate(season.start_date))} – ${seasonDateFmt.format(parseSeasonDate(season.end_date))}`;

  const lillstugaNote = lillstugaDisabled
    ? t('rental.lillstugaClosed')
    : (!lillstugaAllowedIn(priceSeason) && lsSeason && lsSeason !== priceSeason)
      ? t('rental.lillstugaOnly', { from: seasonDateFmt.format(parseSeasonDate(lsSeason.start_date)), to: seasonDateFmt.format(parseSeasonDate(lsSeason.end_date)) })
      : null;

  return (
    <div>
      <h2 className="step-title">{t('dates.title')}</h2>
      <p className="step-description">{t('dates.description')}</p>
      {infoRows.length > 0 && (
        <div style={{ border: '1px solid var(--fm-border)', background: 'var(--fm-orange-light)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <h3 className="rental-select-title" style={{ marginTop: 0, marginBottom: '0.5rem' }}>{t('seasonInfo.title')}</h3>
          {infoRows.map(r => (
            <p key={r.key} style={{ margin: '0.35rem 0', fontSize: '0.95rem' }}>
              <strong>{t(`seasonInfo.${r.key}`)} {fmtSeasonRange(r.season)}:</strong>{' '}
              {r.key === 'summer'
                ? t('seasonInfo.summerText', { lodge: fmt(r.o.full_lodge.minPricePerNight), lillstuga: fmt(r.o.lillstuga.minPricePerNight) })
                : t('seasonInfo.winterText', { lodge: fmt(r.o.full_lodge.minPricePerNight) })}
              {!samePerPerson && <> {t('seasonInfo.perPersonInline', { price: fmt(r.o.full_lodge.pricePerPersonPerNight) })}</>}
            </p>
          ))}
          {samePerPerson && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--fm-text-muted)' }}>
              {t('seasonInfo.perPerson', { price: fmt(infoRows[0].o.full_lodge.pricePerPersonPerNight) })}
            </p>
          )}
        </div>
      )}
      <div className="rental-select">
        <h3 className="rental-select-title">{t('rental.title')}</h3>
        <p className="rental-select-desc">{t('rental.description')}</p>
        <div className="card-grid">
          {RENTAL_OPTIONS.map((optId) => {
            const opt = rentalOptions[optId];
            const info = t(`rental.options.${optId}`);
            const name = typeof info === 'object' ? info.name : optId;
            const description = typeof info === 'object' ? info.description : '';
            const feats = (typeof info === 'object' && Array.isArray(info.features)) ? info.features : [];
            const selected = state.rentalOption === optId;
            const disabled = optId === 'lillstuga' && lillstugaDisabled;
            const note = optId === 'lillstuga' ? lillstugaNote : null;
            return (
              <div key={optId} className={`card ${selected ? 'selected' : ''}`}
                style={disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                onClick={() => { if (!disabled) dispatch({ type: 'SET_RENTAL_OPTION', payload: optId }); }}>
                <div className="card-title">{name}</div>
                <div className="card-price">{fmt(opt.pricePerPersonPerNight)} SEK <span>{t('lodge.perPersonPerNight')}</span></div>
                <div className="lodge-min-price">{t('lodge.minPrice', { price: fmt(opt.minPricePerNight) })}</div>
                <div className="card-description">{description}</div>
                {note && <div className="card-description" style={{ color: 'var(--fm-orange)', fontWeight: 500 }}>{note}</div>}
                <span className="lodge-max">{t('lodge.maxGuests', { count: opt.maxGuests })}</span>
                <div className="card-highlights">
                  {feats.map((f) => (
                    <span key={f} className="highlight-tag"><span className="highlight-check">✓</span> {f}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="guest-count-section">
        <label className="guest-count-label">{t('dates.guestCount')}</label>
        <div className="guest-counter">
          <button onClick={() => dispatch({ type: 'SET_GUESTS', payload: { count: Math.max(1, state.guests.count - 1) } })} disabled={state.guests.count <= 1}>&minus;</button>
          <span className="guest-count">{state.guests.count}</span>
          <button onClick={() => dispatch({ type: 'SET_GUESTS', payload: { count: Math.min(lodge.maxGuests, state.guests.count + 1) } })} disabled={state.guests.count >= lodge.maxGuests}>+</button>
        </div>
      </div>
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={() => (viewMonth === 0 ? (setViewMonth(11), setViewYear(viewYear - 1)) : setViewMonth(viewMonth - 1))}>&larr;</button>
          <span className="calendar-month">{months[viewMonth]} {viewYear}</span>
          <button className="calendar-nav-btn" onClick={() => (viewMonth === 11 ? (setViewMonth(0), setViewYear(viewYear + 1)) : setViewMonth(viewMonth + 1))}>&rarr;</button>
        </div>
        <div className="calendar-grid">
          {weekdays.map((day) => (<div key={day} className="calendar-weekday">{day}</div>))}
          {Array.from({ length: firstDay }).map((_, i) => (<div key={`empty-${i}`} className="calendar-day empty" />))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1, date = new Date(viewYear, viewMonth, day);
            const isOutOfSeason = date < today || !dateInAnySeason(state.seasons, date) || isClosedDay(date);
            const isBooked = isUnavailable(date);
            // En upptagen natt kan ändå väljas som UTCHECKNINGSDAG (avresa på morgonen,
            // nästa gäst checkar in samma eftermiddag) om nätterna innan är lediga.
            const selectableAsCheckout = isBooked && checkIn && !checkOut && date > checkIn && !rangeHasConflict(checkIn, date);
            const isDayDisabled = isBooked && !selectableAsCheckout;
            const bookedStyle = isDayDisabled ? {
              background: '#EDEAE3',
              color: '#A8A49B',
              cursor: 'not-allowed',
            } : undefined;
            return <button key={day} className={getDayClass(day)} style={bookedStyle} onClick={() => !isOutOfSeason && !isDayDisabled && handleDayClick(day)} disabled={isOutOfSeason}>{day}</button>;
          })}
        </div>
        {(checkIn || checkOut) && (
          <div className="date-selection-info">
            <div>{t('dates.checkIn')}: <strong>{formatDate(checkIn)}</strong></div>
            <div>{t('dates.checkOut')}: <strong>{formatDate(checkOut)}</strong></div>
            {nightCount > 0 && (
              <>
                <div><strong>{t('dates.nights', { count: nightCount })}</strong></div>
                <div><strong>{new Intl.NumberFormat('sv-SE').format(getLodgePricePerNight(state.guests.count, lodge) * nightCount)} SEK</strong></div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="step-nav">
        <div />
        <button className="btn btn-primary" disabled={!canProceed} onClick={() => dispatch({ type: 'NEXT_STEP' })}>{t('dates.nextBtn')} &rarr;</button>
      </div>
    </div>
  );
};

const StepAddons = () => {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();
  const priceSeason = seasonForDate(state.seasons, state.dates.checkIn);
  const effSettings = seasonSettings(state.settings, priceSeason);
  const addons = getAddonsList(applySeasonAddonPrices(state.dbAddons, priceSeason), state.rentalOption, effSettings);
  const nightCount = state.dates.checkIn && state.dates.checkOut ? Math.round((state.dates.checkOut - state.dates.checkIn) / (1000 * 60 * 60 * 24)) : 0;
  const guestCount = state.guests.count;
  const formatPrice = (price) => new Intl.NumberFormat('sv-SE').format(price) + ' SEK';
  const getStayDates = () => {
    if (!state.dates.checkIn || !state.dates.checkOut) return [];
    const dates = [];
    const current = new Date(state.dates.checkIn);
    while (current < state.dates.checkOut) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); }
    return dates;
  };
  const formatDateShort = (date) => { const months = t('dates.months'); return `${date.getDate()} ${months[date.getMonth()]}`; };
  const toDateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const toggleAddonDate = (addonId, dateStr) => {
    const current = state.addons[addonId].selectedDates, maxDays = state.addons[addonId].days;
    if (current.includes(dateStr)) { dispatch({ type: 'SET_ADDON_DATES', payload: { addonId, dates: current.filter((d) => d !== dateStr) } }); } else if (current.length < maxDays) { dispatch({ type: 'SET_ADDON_DATES', payload: { addonId, dates: [...current, dateStr] } }); }
  };

  const stayDates = getStayDates();
  const showDatePicker = (addonId) => { const a = state.addons[addonId]; return a && a.selected && a.days > 0 && a.days < nightCount; };

  // Renderar ett enskilt tillvalskort (kryssruta + ev. dagv\u00e4ljare + datumv\u00e4ljare).
  // Anv\u00e4nds b\u00e5de i den vanliga listan och inuti det grupperade Guide-kortet.
  const renderAddonCard = (addon) => {
    const addonState = state.addons[addon.id];
    if (!addonState) return null;
    const isSelected = addonState.selected;
    const addonT = t(`addons.items.${addon.id}`);
    const name = typeof addonT === 'object' ? addonT.name : addon.name;
    const description = typeof addonT === 'object' ? addonT.description : addon.description;
    const unitLabel = typeof addonT === 'object' && addonT.unit ? addonT.unit : (addon.type === 'perDay' ? t('addons.perDay') : addon.type === 'perPerson' ? t('addons.perPerson') : '');
    const isPerDay = addon.type === 'perDay';
    return (
      <div key={addon.id} className="addon-card-wrapper">
        <div className={`addon-card ${isSelected ? 'selected' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: addon.id })}>
          <div className="addon-checkbox">{isSelected && '\u2713'}</div>
          <div className="addon-info">
            <div className="addon-name">{name}</div>
            <div className="addon-description">{description}</div>
            <div className="addon-price">{formatPrice(addon.price)} <span>{unitLabel}</span></div>
          </div>
        </div>
        {isSelected && isPerDay && nightCount > 0 && (
          <div className="addon-day-selector">
            <label className="addon-day-label">{t('addons.howManyDays')}</label>
            <div className="day-counter">
              <button onClick={() => dispatch({ type: 'SET_ADDON_DAYS', payload: { addonId: addon.id, days: Math.max(1, addonState.days - 1) } })} disabled={addonState.days <= 1}>&minus;</button>
              <span className="day-count">{addonState.days} {addonState.days === 1 ? t('addons.day') : t('addons.days')}</span>
              <button onClick={() => dispatch({ type: 'SET_ADDON_DAYS', payload: { addonId: addon.id, days: Math.min(nightCount, addonState.days + 1) } })} disabled={addonState.days >= nightCount}>+</button>
            </div>
            <div className="addon-day-total">{formatPrice(addon.price * addonState.days)}</div>
          </div>
        )}
        {isSelected && addon.type === 'perPerson' && (
          <div className="addon-day-selector">
            <span className="addon-day-label">{guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')}</span>
            <div className="addon-day-total">{formatPrice(addon.price * guestCount)}</div>
          </div>
        )}
        {isSelected && addon.type === 'flat' && (
          <div className="addon-day-selector">
            <span className="addon-day-label">{t('addons.flatFee')}</span>
            <div className="addon-day-total">{formatPrice(addon.price)}</div>
          </div>
        )}
        {isPerDay && showDatePicker(addon.id) && (
          <div className="guide-date-picker">
            <label className="addon-day-label">{t('addons.selectWhichDays')} ({addonState.selectedDates.length}/{addonState.days})</label>
            <div className="guide-date-grid">
              {stayDates.map((date) => {
                const dateStr = toDateString(date), addonDates = addonState.selectedDates, isChosen = addonDates.includes(dateStr), isFull = addonDates.length >= addonState.days && !isChosen;
                return <button key={dateStr} className={`guide-date-btn ${isChosen ? 'chosen' : ''} ${isFull ? 'disabled' : ''}`} onClick={() => toggleAddonDate(addon.id, dateStr)} disabled={isFull}>{formatDateShort(date)}</button>;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const guideOptions = addons.filter(a => a.id === 'guide' || a.id === 'guide_hunting');

  return (
    <div>
      <h2 className="step-title">{t('addons.title')}</h2>
      <p className="step-description">{t('addons.description')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {addons.map((addon) => {
          // Jaktguiden renderas inuti det grupperade Guide-kortet
          if (addon.id === 'guide_hunting') return null;
          // Guide-kortet: gruppera fiske- och jaktguide under en rubrik
          if (addon.id === 'guide') {
            return (
              <div key="guide-group" className="addon-group" style={{ border: '1px solid var(--color-border, #e2ddd0)', borderRadius: '14px', padding: 'var(--space-md, 1rem)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md, 0.75rem)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Guide</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #8a8578)' }}>{t('addons.guideGroupHint')}</div>
                </div>
                {guideOptions.map(g => renderAddonCard(g))}
              </div>
            );
          }
          return renderAddonCard(addon);
        })}
      </div>
      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>&larr; {t('addons.prevBtn')}</button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_STEP' })}>{t('addons.nextBtn')} &rarr;</button>
      </div>
    </div>
  );
};

const StepContact = () => {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();
  const { guests } = state;
  const updateField = (field, value) => { dispatch({ type: 'SET_GUESTS', payload: { [field]: value } }); };
  const canProceed = guests.name.trim() && guests.email.trim() && guests.phone.trim() && guests.gdprConsent;
  return (
    <div>
      <h2 className="step-title">{t('contact.title')}</h2>
      <p className="step-description">{t('contact.description')}</p>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name">{t('contact.name')} *</label>
          <input id="name" type="text" placeholder={t('contact.namePlaceholder')} value={guests.name} onChange={(e) => updateField('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="email">{t('contact.email')} *</label>
          <input id="email" type="email" placeholder={t('contact.emailPlaceholder')} value={guests.email} onChange={(e) => updateField('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="phone">{t('contact.phone')} *</label>
          <input id="phone" type="tel" placeholder={t('contact.phonePlaceholder')} value={guests.phone} onChange={(e) => updateField('phone', e.target.value)} />
        </div>
        <div />
        <div className="form-group full-width">
          <label htmlFor="message">{t('contact.message')}</label>
          <textarea id="message" placeholder={t('contact.messagePlaceholder')} value={guests.message} onChange={(e) => updateField('message', e.target.value)} />
        </div>
        <div className="form-group full-width" style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--fm-border)' }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={guests.gdprConsent} onChange={(e) => updateField('gdprConsent', e.target.checked)} />
            <span>{t('contact.gdprConsent') || 'I consent to the processing of my personal data for this booking request. *'}</span>
          </label>
        </div>
        <div className="form-group full-width">
          <label className="checkbox-label">
            <input type="checkbox" checked={guests.marketingConsent} onChange={(e) => updateField('marketingConsent', e.target.checked)} />
            <span>{t('contact.marketingConsent') || 'I would like to receive news and offers from Flightmode Adventures.'}</span>
          </label>
        </div>
      </div>
      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>&larr; {t('contact.prevBtn')}</button>
        <button className="btn btn-primary" disabled={!canProceed} onClick={() => dispatch({ type: 'NEXT_STEP' })}>{t('contact.nextBtn')} &rarr;</button>
      </div>
    </div>
  );
};

const StepSummary = () => {
  const { state, dispatch } = useBooking();
  const { t, lang } = useI18n();
  const priceSeason = seasonForDate(state.seasons, state.dates.checkIn);
  const effSettings = seasonSettings(state.settings, priceSeason);
  const lodge = getLodgeConfig(effSettings, state.rentalOption);
  const addons = getAddonsList(applySeasonAddonPrices(state.dbAddons, priceSeason), state.rentalOption, effSettings);
  const [submitted, setSubmitted] = useState(false), [sending, setSending] = useState(false);
  const months = t('dates.months'), selectedAddons = addons.filter((a) => state.addons[a.id]?.selected), guestCount = state.guests.count;
  const nightCount = state.dates.checkIn && state.dates.checkOut ? Math.round((state.dates.checkOut - state.dates.checkIn) / (1000 * 60 * 60 * 24)) : 0;
  const formatPrice = (price) => new Intl.NumberFormat('sv-SE').format(price) + ' SEK';
  const formatDate = (date) => !date ? '—' : `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  const formatDateShort = (dateStr) => { const d = new Date(dateStr); return `${d.getDate()} ${months[d.getMonth()]}`; };
  const getAddonTotal = (addon) => {
    const addonState = state.addons[addon.id];
    if (addon.type === 'perDay') return addon.price * addonState.days;
    if (addon.type === 'perPerson') return addon.price * guestCount;
    if (addon.type === 'flat') return addon.price;
    return 0;
  };
  const lodgePricePerNight = getLodgePricePerNight(guestCount, lodge);
  let totalEstimate = lodgePricePerNight * nightCount;
  selectedAddons.forEach((addon) => { totalEstimate += getAddonTotal(addon); });
  const handleSubmit = async () => {
    setSending(true);
    try {
      // Map addon slugs to database UUIDs
      const dbAddons = state.dbAddons || [];
      const addonSlugToId = Object.fromEntries(dbAddons.map(a => [a.slug, a.id]));

      const formatDateStr = (date) => {
        if (!date) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };

      const lodgeTotal = lodgePricePerNight * nightCount;
      const addonsTotal = selectedAddons.reduce((sum, addon) => sum + getAddonTotal(addon), 0);

      const result = await createBookingRequest({
        guest: {
          name: state.guests.name,
          email: state.guests.email,
          phone: state.guests.phone || null,
          language: lang || 'en',
          gdpr_consent: state.guests.gdprConsent,
          marketing_consent: state.guests.marketingConsent,
        },
        booking: {
          check_in: formatDateStr(state.dates.checkIn),
          check_out: formatDateStr(state.dates.checkOut),
          num_guests: guestCount,
          message: state.guests.message || null,
          rental_option: state.rentalOption,
        },
        addons: selectedAddons.map((addon) => {
          const addonState = state.addons[addon.id];
          const quantity = addon.type === 'perDay' ? addonState.days
            : addon.type === 'perPerson' ? guestCount
            : 1;
          return {
            addon_id: addonSlugToId[addon.id],
            quantity,
            unit_price: addon.price,
            total_price: getAddonTotal(addon),
            selected_dates: addon.type === 'perDay' && addonState.selectedDates?.length > 0
              ? addonState.selectedDates
              : null,
          };
        }).filter(a => a.addon_id), // Only include addons that exist in DB
        pricing: {
          lodge_total: lodgeTotal,
          addons_total: addonsTotal,
          total_price: totalEstimate,
          deposit_amount: parseInt(effSettings?.deposit_amount) || 5000,
        },
      });

      console.log('Booking created:', result);
      dispatch({ type: 'SET_SUBMITTED_REF', payload: result.reference });
      setSubmitted(true);
    } catch (error) {
      console.error('Error sending booking request:', error);
      alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };
  if (submitted) {
    return (
      <div className="confirmation-box">
        <div className="confirmation-icon">&#x1F3A3;</div>
        <h2>{t('summary.confirmation.title')}</h2>
        {state.submittedRef && <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--fm-orange)', marginBottom: 'var(--space-md)' }}>Ref: {state.submittedRef}</p>}
        <p>{t('summary.confirmation.text')} <strong>{state.guests.email}</strong>.</p>
        <p style={{ marginTop: 'var(--space-lg)' }}>{t('summary.confirmation.contactText')} <a href="mailto:info@flightmode.se" style={{ color: 'var(--fm-orange)' }}>info@flightmode.se</a></p>
        <button className="btn btn-primary" style={{ marginTop: 'var(--space-xl)' }} onClick={() => { dispatch({ type: 'RESET' }); setSubmitted(false); }}>{t('summary.confirmation.newBooking')}</button>
      </div>
    );
  }
  return (
    <div>
      <h2 className="step-title">{t('summary.title')}</h2>
      <p className="step-description">{t('summary.description')}</p>
      <div className="summary-section">
        <h3>{t('summary.datesAndGuests')}</h3>
        <div className="summary-row"><span>{t('summary.checkIn')}</span><strong>{formatDate(state.dates.checkIn)}</strong></div>
        <div className="summary-row"><span>{t('summary.checkOut')}</span><strong>{formatDate(state.dates.checkOut)}</strong></div>
        <div className="summary-row"><span>{t('summary.nights')}</span><strong>{nightCount}</strong></div>
        <div className="summary-row"><span>{t('summary.guests')}</span><strong>{guestCount}</strong></div>
      </div>
      <div className="summary-section">
        <h3>{t('summary.lodge')}</h3>
        <div className="summary-row"><span>{t(`rental.options.${state.rentalOption}.name`)}</span><strong>{formatPrice(lodgePricePerNight * nightCount)}</strong></div>
        <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}>
          <span>{nightCount} {nightCount === 1 ? t('summary.night') : t('summary.nightsPlural')} × {formatPrice(lodgePricePerNight)} ({guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')} × {formatPrice(lodge.pricePerPersonPerNight)})</span>
        </div>
      </div>
      {selectedAddons.length > 0 && (
        <div className="summary-section">
          <h3>{t('summary.extras')}</h3>
          {selectedAddons.map((addon) => {
            const addonT = t(`addons.items.${addon.id}`), addonName = typeof addonT === 'object' ? addonT.name : addon.name, addonTotal = getAddonTotal(addon), addonState = state.addons[addon.id];
            return (
              <div key={addon.id}>
                <div className="summary-row">
                  <span>{addonName}{addon.type === 'perDay' && <> ({addonState.days} {addonState.days === 1 ? t('addons.day') : t('addons.days')})</>}{addon.type === 'perPerson' && <> ({guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')})</>}</span>
                  <strong>{formatPrice(addonTotal)}</strong>
                </div>
                {addon.type === 'perDay' && <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}><span>{addonState.days} {addonState.days === 1 ? t('addons.day') : t('addons.days')} × {formatPrice(addon.price)}</span></div>}
                {addon.type === 'perPerson' && <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}><span>{guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')} × {formatPrice(addon.price)}</span></div>}
                {(addon.id === 'guide' || addon.id === 'boat') && addonState.selectedDates?.length > 0 && <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}><span>{t(`addons.${addon.id === 'guide' ? 'guideDays' : 'boatDays'}`)}: {addonState.selectedDates.map(d => formatDateShort(new Date(d + 'T00:00:00'))).join(', ')}</span></div>}
              </div>
            );
          })}
        </div>
      )}
      <div className="summary-section">
        <h3>{t('summary.contactDetails')}</h3>
        <div className="summary-row"><span>{t('summary.name')}</span><strong>{state.guests.name}</strong></div>
        <div className="summary-row"><span>{t('summary.email')}</span><strong>{state.guests.email}</strong></div>
        <div className="summary-row"><span>{t('summary.phone')}</span><strong>{state.guests.phone}</strong></div>
        {state.guests.message && <div className="summary-row"><span>{t('summary.message')}</span><strong style={{ textAlign: 'right', maxWidth: '60%' }}>{state.guests.message}</strong></div>}
      </div>
      <div className="summary-total"><span>{t('summary.total')} </span>{formatPrice(totalEstimate)}</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--fm-text-muted)', marginTop: 'var(--space-md)', textAlign: 'center' }}>{t('summary.disclaimer')}</p>
      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>&larr; {t('summary.prevBtn')}</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>{sending ? t('summary.sending') : t('summary.submitBtn')}</button>
      </div>
    </div>
  );
};

const BookingWizard = () => {
  const { state } = useBooking();
  const { t } = useI18n();
  const STEPS = [
    { key: 'dates', component: StepDates },
    { key: 'addons', component: StepAddons },
    { key: 'contact', component: StepContact },
    { key: 'summary', component: StepSummary },
  ];
  const CurrentStepComponent = STEPS[state.currentStep]?.component;
  return (
    <div>
      <div className="stepper">
        {STEPS.map((step, index) => {
          let className = 'stepper-step';
          if (index === state.currentStep) className += ' active';
          if (index < state.currentStep) className += ' completed';
          return (
            <div key={step.key} className={className}>
              <div className="stepper-number">{index < state.currentStep ? '\u2713' : index + 1}</div>
              <span className="stepper-label">{t(`stepper.${step.key}`)}</span>
            </div>
          );
        })}
      </div>
      <div className="step-container" key={state.currentStep}>
        {CurrentStepComponent && <CurrentStepComponent />}
      </div>
    </div>
  );
};

const BookingApp = () => {
  // Startspråk från ?lang=sv|de|fr|en (länkas från flightmode.se), annars engelska
  const [lang, setLang] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('lang');
    return p && translations[p.toLowerCase()] ? p.toLowerCase() : 'en';
  });
  // Fliktitel och <html lang> följer valt språk
  useEffect(() => {
    const titles = { en: 'Book your stay', sv: 'Boka din vistelse', de: 'Aufenthalt buchen', fr: 'Réserver votre séjour' };
    document.documentElement.lang = lang;
    document.title = `${titles[lang] || titles.en} – Vilhelmina River Lodge`;
  }, [lang]);
  return (
    <I18nProvider lang={lang}>
      <BookingProvider>
        <div className="booking-app">
          <div className="booking-header">
            <div className="language-switcher">
              {['en', 'sv', 'de', 'fr'].map((l) => (
                <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
                  <span className="lang-flag">{/Win/.test(navigator.platform) ? l.toUpperCase() : (l === 'en' ? '🇬🇧' : l === 'sv' ? '🇸🇪' : l === 'de' ? '🇩🇪' : '🇫🇷')}</span>
                  {!/Win/.test(navigator.platform) && <span className="lang-code">{l.toUpperCase()}</span>}
                </button>
              ))}
            </div>
            <h1 className="booking-title">{translations[lang]?.header?.title}</h1>
            {translations[lang]?.header?.tagline && <p className="booking-tagline">{translations[lang]?.header?.tagline}</p>}
          </div>
          <BookingWizard />
        </div>
        <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;600;700&family=Inter+Tight:wght@300;400;500;600&display=swap');:root{--fm-orange:#E38A05;--fm-orange-light:rgba(227,138,5,0.12);--fm-orange-hover:#c77a04;--fm-brown:#8A501E;--fm-olive:#568C03;--fm-dark-green:#4A592A;--fm-steel:#3C6680;--fm-sky:#7EADBF;--fm-light:#E0E0E0;--fm-black:#1A1A1A;--fm-white:#FFFFFF;--fm-bg:#FAF9F6;--fm-bg-card:#FFFFFF;--fm-border:#E0DDD5;--fm-text:#1A1A1A;--fm-text-muted:#6B6B6B;--fm-success:#568C03;--fm-error:#C0392B;--font-heading:'Archivo Narrow',Arial,sans-serif;--font-body:'Inter Tight',Arial,sans-serif;--space-xs:0.25rem;--space-sm:0.5rem;--space-md:1rem;--space-lg:1.5rem;--space-xl:2rem;--space-2xl:3rem;--radius-sm:4px;--radius-md:8px;--radius-lg:12px}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font-body);color:var(--fm-text);background:var(--fm-bg);line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}h1,h2,h3,h4,h5,h6{font-family:var(--font-heading);font-weight:600;line-height:1.2;color:var(--fm-text)}button{cursor:pointer;font-family:var(--font-body)}input,select,textarea{font-family:var(--font-body)}#root{max-width:960px;margin:0 auto;padding:var(--space-sm)}@media(min-width:640px){#root{padding:var(--space-lg)}}.booking-app{min-height:100vh}.booking-header{text-align:center;padding:var(--space-2xl) 0 var(--space-xl);border-bottom:2px solid var(--fm-orange);margin-bottom:var(--space-2xl);position:relative}.language-switcher{display:flex;justify-content:center;gap:var(--space-xs);margin-bottom:var(--space-lg)}.lang-btn{display:flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid var(--fm-border);border-radius:20px;background:var(--fm-white);font-size:0.8rem;color:var(--fm-text-muted);transition:all 0.2s}.lang-btn:hover{border-color:var(--fm-orange);color:var(--fm-text)}.lang-btn.active{background:var(--fm-orange);border-color:var(--fm-orange);color:var(--fm-white)}.lang-flag{font-size:1rem}.lang-code{font-weight:600;letter-spacing:0.5px;display:none}@media(min-width:768px){.lang-code{display:inline}}.booking-title{font-size:2.5rem;font-weight:700;color:var(--fm-text);letter-spacing:-0.5px}.booking-tagline{font-size:1.1rem;color:var(--fm-orange);margin-top:var(--space-sm);font-weight:400;font-style:italic}.stepper{display:flex;justify-content:center;gap:var(--space-xs);margin-bottom:var(--space-2xl);flex-wrap:wrap}.stepper-step{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);border-radius:var(--radius-lg);font-size:0.85rem;font-weight:500;color:var(--fm-text-muted);background:transparent;transition:all 0.2s ease}.stepper-step.active{background:var(--fm-orange-light);color:var(--fm-orange)}.stepper-step.completed{color:var(--fm-olive)}.stepper-number{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:600;border:2px solid var(--fm-border);background:var(--fm-white);flex-shrink:0}.stepper-step.active .stepper-number{border-color:var(--fm-orange);background:var(--fm-orange);color:var(--fm-white)}.stepper-step.completed .stepper-number{border-color:var(--fm-olive);background:var(--fm-olive);color:var(--fm-white)}.stepper-label{display:inline;font-size:0.75rem}@media(min-width:768px){.stepper-label{font-size:0.85rem}}.step-container{animation:fadeIn 0.3s ease}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.step-title{font-size:1.75rem;margin-bottom:var(--space-sm);color:var(--fm-text)}.step-description{color:var(--fm-text-muted);margin-bottom:var(--space-xl);font-size:0.95rem}.step-nav{display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-2xl);padding-top:var(--space-xl);border-top:1px solid var(--fm-border)}.btn{padding:0.75rem 1.75rem;border-radius:var(--radius-md);font-size:0.95rem;font-weight:500;border:none;transition:all 0.2s ease;display:inline-flex;align-items:center;gap:var(--space-sm)}.btn-primary{background:var(--fm-orange);color:var(--fm-white)}.btn-primary:hover{background:var(--fm-orange-hover)}.btn-primary:disabled{background:var(--fm-border);color:var(--fm-text-muted);cursor:not-allowed}.btn-secondary{background:transparent;color:var(--fm-text-muted);border:1px solid var(--fm-border)}.btn-secondary:hover{border-color:var(--fm-text-muted);color:var(--fm-text)}.card-grid{display:grid;grid-template-columns:1fr;gap:var(--space-lg)}@media(min-width:640px){.card-grid{grid-template-columns:repeat(2,1fr)}}.card{background:var(--fm-bg-card);border:2px solid var(--fm-border);border-radius:var(--radius-lg);padding:var(--space-xl);cursor:pointer;transition:all 0.2s ease;text-align:left}.card:hover{border-color:var(--fm-orange);box-shadow:0 4px 12px rgba(227,138,5,0.1)}.card.selected{border-color:var(--fm-orange);background:var(--fm-orange-light)}.card-title{font-family:var(--font-heading);font-size:1.2rem;font-weight:600;margin-bottom:var(--space-sm)}.card-description{color:var(--fm-text-muted);font-size:0.9rem;margin-bottom:var(--space-md);line-height:1.5}.card-price{font-size:1.3rem;font-weight:600;color:var(--fm-orange)}.card-price span{font-size:0.85rem;font-weight:400;color:var(--fm-text-muted)}.card-highlights{display:flex;flex-wrap:wrap;gap:var(--space-sm);margin-top:var(--space-md)}.highlight-tag{background:var(--fm-bg);color:var(--fm-dark-green);font-size:0.8rem;padding:0.25rem 0.75rem;border-radius:20px;font-weight:500;display:inline-flex;align-items:center;gap:4px}.highlight-check{color:var(--fm-olive);font-weight:700;font-size:0.85rem}.card.selected .highlight-tag{background:var(--fm-white)}.rental-select{margin-bottom:var(--space-xl)}.rental-select-title{font-size:1.15rem;margin-bottom:var(--space-xs)}.rental-select-desc{color:var(--fm-text-muted);font-size:0.9rem;margin-bottom:var(--space-md)}.rental-select .card{display:flex;flex-direction:column;gap:var(--space-xs)}.rental-select .card .lodge-max{align-self:flex-start;margin-top:var(--space-xs)}.rental-select .card-price{margin-top:var(--space-xs)}.lodge-card{background:var(--fm-bg-card);border:2px solid var(--fm-orange);border-radius:var(--radius-lg);padding:var(--space-xl);margin-bottom:var(--space-xl)}.lodge-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);flex-wrap:wrap;gap:var(--space-sm)}.lodge-card-header h3{font-family:var(--font-heading);font-size:1.4rem;font-weight:700}.lodge-price{font-size:1.3rem;font-weight:600;color:var(--fm-orange)}.lodge-price span{font-size:0.85rem;font-weight:400;color:var(--fm-text-muted)}.lodge-min-price{font-size:0.8rem;color:var(--fm-text-muted);margin-bottom:var(--space-sm);font-style:italic}.lodge-description{color:var(--fm-text-muted);font-size:0.9rem;margin-bottom:var(--space-md);line-height:1.5}.lodge-details{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-md)}.lodge-max{font-size:0.85rem;font-weight:600;color:var(--fm-dark-green);background:rgba(86,140,3,0.1);padding:0.25rem 0.75rem;border-radius:20px}.guest-count-section{background:var(--fm-bg-card);border:1px solid var(--fm-border);border-radius:var(--radius-lg);padding:var(--space-lg) var(--space-xl);margin-bottom:var(--space-xl);display:flex;align-items:center;justify-content:space-between}.guest-count-label{font-weight:500;font-size:0.95rem;color:var(--fm-text)}.calendar-container{background:var(--fm-bg-card);border:1px solid var(--fm-border);border-radius:var(--radius-lg);padding:var(--space-md);overflow:hidden}@media(min-width:640px){.calendar-container{padding:var(--space-xl)}}.calendar-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)}.calendar-month{font-family:var(--font-heading);font-size:1.3rem;font-weight:600}.calendar-nav-btn{width:36px;height:36px;border-radius:50%;border:1px solid var(--fm-border);background:var(--fm-white);display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:var(--fm-text);transition:all 0.2s}.calendar-nav-btn:hover{border-color:var(--fm-orange);color:var(--fm-orange)}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;width:100%}.calendar-weekday{text-align:center;font-size:0.65rem;font-weight:600;color:var(--fm-text-muted);padding:var(--space-xs) 0;text-transform:uppercase;letter-spacing:0.3px;min-width:0;overflow:hidden}@media(min-width:640px){.calendar-weekday{font-size:0.75rem;padding:var(--space-sm);letter-spacing:0.5px}}.calendar-day{display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);font-size:0.8rem;border:none;background:transparent;color:var(--fm-text);transition:all 0.15s;padding:0.5rem 0;min-width:0}@media(min-width:640px){.calendar-day{font-size:0.9rem;padding:0.6rem 0;border-radius:var(--radius-md)}}.calendar-day:hover:not(.disabled):not(.empty){background:var(--fm-orange-light);color:var(--fm-orange)}.calendar-day.selected{background:var(--fm-orange);color:var(--fm-white);font-weight:600}.calendar-day.in-range{background:var(--fm-orange-light);color:var(--fm-orange);border-radius:0}.calendar-day.range-start{border-radius:var(--radius-md) 0 0 var(--radius-md)}.calendar-day.range-end{border-radius:0 var(--radius-md) var(--radius-md) 0}.calendar-day.disabled{color:var(--fm-border);cursor:not-allowed}.calendar-day.empty{cursor:default}.calendar-day.today{font-weight:700;border:2px solid var(--fm-orange)}.date-selection-info{display:flex;gap:var(--space-xl);margin-top:var(--space-lg);padding:var(--space-md);background:var(--fm-orange-light);border-radius:var(--radius-md);justify-content:center;font-size:0.9rem}.date-selection-info strong{color:var(--fm-orange)}.addon-card{display:flex;align-items:flex-start;gap:var(--space-md);background:var(--fm-bg-card);border:2px solid var(--fm-border);border-radius:var(--radius-lg);padding:var(--space-lg);cursor:pointer;transition:all 0.2s ease}.addon-card:hover{border-color:var(--fm-orange)}.addon-card.selected{border-color:var(--fm-orange);background:var(--fm-orange-light)}.addon-checkbox{width:24px;height:24px;border-radius:var(--radius-sm);border:2px solid var(--fm-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;transition:all 0.2s}.addon-card.selected .addon-checkbox{background:var(--fm-orange);border-color:var(--fm-orange);color:var(--fm-white)}.addon-info{flex:1}.addon-name{font-weight:600;margin-bottom:var(--space-xs)}.addon-description{color:var(--fm-text-muted);font-size:0.85rem;margin-bottom:var(--space-sm)}.addon-price{color:var(--fm-orange);font-weight:600}.addon-price span{font-weight:400;color:var(--fm-text-muted);font-size:0.85rem}.addon-card-wrapper{display:flex;flex-direction:column}.addon-day-selector{background:var(--fm-orange-light);border:2px solid var(--fm-orange);border-top:none;border-radius:0 0 var(--radius-lg) var(--radius-lg);padding:var(--space-lg);display:flex;align-items:center;gap:var(--space-lg);flex-wrap:wrap}.addon-card.selected{border-radius:var(--radius-lg) var(--radius-lg) 0 0}.addon-card-wrapper .addon-card:not(.selected){border-radius:var(--radius-lg)}.addon-day-label{font-size:0.85rem;font-weight:500;color:var(--fm-text)}.day-counter{display:flex;align-items:center;gap:var(--space-sm)}.day-counter button{width:32px;height:32px;border-radius:50%;border:2px solid var(--fm-border);background:var(--fm-white);font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:var(--fm-text)}.day-counter button:hover:not(:disabled){border-color:var(--fm-orange);color:var(--fm-orange)}.day-counter button:disabled{opacity:0.3;cursor:not-allowed}.day-count{font-size:1rem;font-weight:600;min-width:60px;text-align:center}.addon-day-total{margin-left:auto;font-weight:600;color:var(--fm-orange);font-size:1rem}.guide-date-picker{background:var(--fm-bg-card);border:2px solid var(--fm-orange);border-top:none;border-radius:0 0 var(--radius-lg) var(--radius-lg);padding:var(--space-lg)}.addon-day-selector+.guide-date-picker{border-radius:0 0 var(--radius-lg) var(--radius-lg)}.addon-card-wrapper:has(.guide-date-picker) .addon-day-selector{border-radius:0}.guide-date-grid{display:flex;flex-wrap:wrap;gap:var(--space-sm);margin-top:var(--space-sm)}.guide-date-btn{padding:0.5rem 1rem;border:2px solid var(--fm-border);border-radius:var(--radius-md);background:var(--fm-white);font-size:0.85rem;font-weight:500;color:var(--fm-text);transition:all 0.2s}.guide-date-btn:hover:not(.disabled){border-color:var(--fm-orange);color:var(--fm-orange)}.guide-date-btn.chosen{background:var(--fm-orange);border-color:var(--fm-orange);color:var(--fm-white)}.guide-date-btn.disabled{opacity:0.35;cursor:not-allowed}.form-grid{display:grid;grid-template-columns:1fr;gap:var(--space-lg)}@media(min-width:640px){.form-grid{grid-template-columns:repeat(2,1fr)}.form-grid .form-group.full-width{grid-column:1/-1}}.form-group label{display:block;font-size:0.85rem;font-weight:500;color:var(--fm-text);margin-bottom:var(--space-sm)}.form-group input,.form-group select,.form-group textarea{width:100%;padding:0.75rem 1rem;border:1px solid var(--fm-border);border-radius:var(--radius-md);font-size:0.95rem;background:var(--fm-white);color:var(--fm-text);transition:border-color 0.2s}.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--fm-orange);box-shadow:0 0 0 3px var(--fm-orange-light)}.form-group textarea{resize:vertical;min-height:100px}.summary-section{background:var(--fm-bg-card);border:1px solid var(--fm-border);border-radius:var(--radius-lg);padding:var(--space-xl);margin-bottom:var(--space-lg)}.summary-section h3{font-size:0.85rem;color:var(--fm-text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--space-md);font-family:var(--font-body);font-weight:600}.summary-row{display:flex;justify-content:space-between;align-items:center;padding:var(--space-sm) 0}.summary-row+.summary-row{border-top:1px solid var(--fm-border)}.summary-total{font-size:1.3rem;font-weight:600;color:var(--fm-orange);padding-top:var(--space-md);border-top:2px solid var(--fm-orange);margin-top:var(--space-md);text-align:right}.summary-total span{color:var(--fm-text);font-weight:400}.confirmation-box{text-align:center;padding:var(--space-2xl)}.confirmation-icon{font-size:3rem;margin-bottom:var(--space-lg)}.confirmation-box h2{font-size:1.75rem;margin-bottom:var(--space-md);color:var(--fm-olive)}.checkbox-label{display:flex;align-items:flex-start;cursor:pointer;font-size:0.9rem;color:var(--fm-text);line-height:1.5}.checkbox-label input[type="checkbox"]{margin-top:4px;margin-right:12px;width:20px;height:20px;accent-color:var(--fm-orange);flex-shrink:0}.confirmation-box p{color:var(--fm-text-muted);max-width:480px;margin:0 auto;line-height:1.7}.guest-counter{display:flex;align-items:center;gap:var(--space-md)}.guest-counter button{width:40px;height:40px;border-radius:50%;border:2px solid var(--fm-border);background:var(--fm-white);font-size:1.2rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:var(--fm-text)}.guest-counter button:hover:not(:disabled){border-color:var(--fm-orange);color:var(--fm-orange)}.guest-counter button:disabled{opacity:0.3;cursor:not-allowed}.guest-count{font-size:1.5rem;font-weight:600;min-width:40px;text-align:center}`}} />
      </BookingProvider>
    </I18nProvider>
  );
};

export default BookingApp;
