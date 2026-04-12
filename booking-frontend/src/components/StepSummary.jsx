import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';
import { lodge, addons, getLodgePricePerNight } from '../data/packages';

function formatPrice(price) {
  return new Intl.NumberFormat('sv-SE').format(price) + ' SEK';
}

export default function StepSummary() {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const months = t('dates.months');
  const selectedAddons = addons.filter((a) => state.addons[a.id]?.selected);
  const guestCount = state.guests.count;

  const nightCount = state.dates.checkIn && state.dates.checkOut
    ? Math.round((state.dates.checkOut - state.dates.checkIn) / (1000 * 60 * 60 * 24))
    : 0;

  function formatDate(date) {
    if (!date) return '\u2014';
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  function getAddonTotal(addon) {
    const addonState = state.addons[addon.id];
    if (addon.type === 'perDay') return addon.price * addonState.days;
    if (addon.type === 'perPerson') return addon.price * guestCount;
    if (addon.type === 'flat') return addon.price;
    return 0;
  }

  // Calculate total
  const lodgePricePerNight = getLodgePricePerNight(guestCount);
  let totalEstimate = lodgePricePerNight * nightCount;
  selectedAddons.forEach((addon) => {
    totalEstimate += getAddonTotal(addon);
  });

  async function handleSubmit() {
    setSending(true);
    try {
      const bookingData = {
        lodge: lodge.name,
        checkIn: state.dates.checkIn?.toISOString(),
        checkOut: state.dates.checkOut?.toISOString(),
        nights: nightCount,
        guests: guestCount,
        contact: {
          name: state.guests.name,
          email: state.guests.email,
          phone: state.guests.phone,
          message: state.guests.message,
        },
        addons: selectedAddons.map((addon) => ({
          id: addon.id,
          name: addon.name,
          type: addon.type,
          ...(addon.type === 'perDay' ? { days: state.addons[addon.id].days, pricePerDay: addon.price } : {}),
          ...(addon.type === 'perPerson' ? { guests: guestCount, pricePerPerson: addon.price } : {}),
          ...(addon.type === 'flat' ? { price: addon.price } : {}),
          total: getAddonTotal(addon),
          ...(addon.id === 'guide' && state.addons.guide.selectedDates.length > 0
            ? { selectedDates: state.addons.guide.selectedDates }
            : {}),
        })),
        lodgePricePerNight,
        lodgeTotal: lodgePricePerNight * nightCount,
        totalEstimate,
      };

      // Send booking request to info@flightmode.se via API
      const BOOKING_API_URL = import.meta.env.VITE_BOOKING_API_URL || null;

      if (BOOKING_API_URL) {
        const response = await fetch(BOOKING_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        });
        if (!response.ok) throw new Error('Failed to send booking request');
      } else {
        console.log('Booking request data (API not configured):', bookingData);
        console.log('Will be sent to: info@flightmode.se');
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error sending booking request:', error);
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="confirmation-box">
        <div className="confirmation-icon">&#x1F3A3;</div>
        <h2>{t('summary.confirmation.title')}</h2>
        <p>
          {t('summary.confirmation.text')}{' '}
          <strong>{state.guests.email}</strong>.
        </p>
        <p style={{ marginTop: 'var(--space-lg)' }}>
          {t('summary.confirmation.contactText')}{' '}
          <a href="mailto:info@flightmode.se" style={{ color: 'var(--fm-orange)' }}>
            info@flightmode.se
          </a>
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 'var(--space-xl)' }}
          onClick={() => { dispatch({ type: 'RESET' }); setSubmitted(false); }}
        >
          {t('summary.confirmation.newBooking')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="step-title">{t('summary.title')}</h2>
      <p className="step-description">{t('summary.description')}</p>

      <div className="summary-section">
        <h3>{t('summary.datesAndGuests')}</h3>
        <div className="summary-row">
          <span>{t('summary.checkIn')}</span>
          <strong>{formatDate(state.dates.checkIn)}</strong>
        </div>
        <div className="summary-row">
          <span>{t('summary.checkOut')}</span>
          <strong>{formatDate(state.dates.checkOut)}</strong>
        </div>
        <div className="summary-row">
          <span>{t('summary.nights')}</span>
          <strong>{nightCount}</strong>
        </div>
        <div className="summary-row">
          <span>{t('summary.guests')}</span>
          <strong>{guestCount}</strong>
        </div>
      </div>

      <div className="summary-section">
        <h3>{t('summary.lodge')}</h3>
        <div className="summary-row">
          <span>{t('lodge.name')}</span>
          <strong>{formatPrice(lodgePricePerNight * nightCount)}</strong>
        </div>
        <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}>
          <span>{nightCount} {nightCount === 1 ? t('summary.night') : t('summary.nightsPlural')} &times; {formatPrice(lodgePricePerNight)}{' '}
          ({guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')} &times; {formatPrice(lodge.pricePerPersonPerNight)})</span>
        </div>
      </div>

      {selectedAddons.length > 0 && (
        <div className="summary-section">
          <h3>{t('summary.extras')}</h3>
          {selectedAddons.map((addon) => {
            const addonT = t(`addons.items.${addon.id}`);
            const addonName = typeof addonT === 'object' ? addonT.name : addon.name;
            const addonTotal = getAddonTotal(addon);
            const addonState = state.addons[addon.id];

            return (
              <div key={addon.id}>
                <div className="summary-row">
                  <span>
                    {addonName}
                    {addon.type === 'perDay' && (
                      <> ({addonState.days} {addonState.days === 1 ? t('addons.day') : t('addons.days')})</>
                    )}
                    {addon.type === 'perPerson' && (
                      <> ({guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')})</>
                    )}
                  </span>
                  <strong>{formatPrice(addonTotal)}</strong>
                </div>
                {addon.type === 'perDay' && (
                  <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}>
                    <span>{addonState.days} {addonState.days === 1 ? t('addons.day') : t('addons.days')} &times; {formatPrice(addon.price)}</span>
                  </div>
                )}
                {addon.type === 'perPerson' && (
                  <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}>
                    <span>{guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')} &times; {formatPrice(addon.price)}</span>
                  </div>
                )}
                {addon.id === 'guide' && state.addons.guide.selectedDates.length > 0 && (
                  <div className="summary-row" style={{ color: 'var(--fm-text-muted)', fontSize: '0.85rem' }}>
                    <span>{t('addons.guideDays')}: {state.addons.guide.selectedDates.map(formatDateShort).join(', ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="summary-section">
        <h3>{t('summary.contactDetails')}</h3>
        <div className="summary-row">
          <span>{t('summary.name')}</span>
          <strong>{state.guests.name}</strong>
        </div>
        <div className="summary-row">
          <span>{t('summary.email')}</span>
          <strong>{state.guests.email}</strong>
        </div>
        <div className="summary-row">
          <span>{t('summary.phone')}</span>
          <strong>{state.guests.phone}</strong>
        </div>
        {state.guests.message && (
          <div className="summary-row">
            <span>{t('summary.message')}</span>
            <strong style={{ textAlign: 'right', maxWidth: '60%' }}>{state.guests.message}</strong>
          </div>
        )}
      </div>

      <div className="summary-total">
        <span>{t('summary.total')} </span>
        {formatPrice(totalEstimate)}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--fm-text-muted)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
        {t('summary.disclaimer')}
      </p>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          &larr; {t('summary.prevBtn')}
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>
          {sending ? t('summary.sending') : t('summary.submitBtn')}
        </button>
      </div>
    </div>
  );
}
