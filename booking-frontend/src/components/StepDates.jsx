import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';
import { lodge, getLodgePricePerNight } from '../data/packages';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function StepDates() {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() >= 4 ? today.getMonth() : 4);

  const months = t('dates.months');
  const weekdays = t('dates.weekdays');
  const { checkIn, checkOut } = state.dates;

  function formatDate(date) {
    if (!date) return '—';
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  function handleDayClick(day) {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!checkIn || (checkIn && checkOut)) {
      dispatch({ type: 'SET_DATES', payload: { checkIn: clicked, checkOut: null } });
    } else {
      if (clicked > checkIn) {
        dispatch({ type: 'SET_DATES', payload: { checkIn, checkOut: clicked } });
      } else {
        dispatch({ type: 'SET_DATES', payload: { checkIn: clicked, checkOut: null } });
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function getDayClass(day) {
    const date = new Date(viewYear, viewMonth, day);
    const classes = ['calendar-day'];
    if (isSameDay(date, today)) classes.push('today');
    if (date < today || date.getMonth() < 4 || date.getMonth() > 8) {
      classes.push('disabled');
      return classes.join(' ');
    }
    if (isSameDay(date, checkIn)) {
      classes.push('selected');
      if (checkOut) classes.push('range-start');
    } else if (isSameDay(date, checkOut)) {
      classes.push('selected', 'range-end');
    } else if (checkIn && checkOut && date > checkIn && date < checkOut) {
      classes.push('in-range');
    }
    return classes.join(' ');
  }

  const nightCount = checkIn && checkOut
    ? Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    : 0;
  const canProceed = checkIn && checkOut && nightCount > 0;

  const lodgeFeatures = t('lodge.features');

  function updateGuestCount(value) {
    dispatch({ type: 'SET_GUESTS', payload: { count: value } });
  }

  return (
    <div>
      <h2 className="step-title">{t('dates.title')}</h2>
      <p className="step-description">{t('dates.description')}</p>

      <div className="lodge-card">
        <div className="lodge-card-header">
          <h3>{t('lodge.name')}</h3>
          <div className="lodge-price">
            {new Intl.NumberFormat('sv-SE').format(lodge.pricePerPersonPerNight)} SEK <span>{t('lodge.perPersonPerNight')}</span>
          </div>
        </div>
        <p className="lodge-min-price">{t('lodge.minPrice', { price: new Intl.NumberFormat('sv-SE').format(lodge.minPricePerNight) })}</p>
        <p className="lodge-description">{t('lodge.description')}</p>
        <div className="lodge-details">
          <span className="lodge-max">{t('lodge.maxGuests', { count: lodge.maxGuests })}</span>
          <div className="card-highlights">
            {(Array.isArray(lodgeFeatures) ? lodgeFeatures : lodge.features).map((f) => (
              <span key={f} className="highlight-tag">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="guest-count-section">
        <label className="guest-count-label">{t('dates.guestCount')}</label>
        <div className="guest-counter">
          <button
            onClick={() => updateGuestCount(Math.max(1, state.guests.count - 1))}
            disabled={state.guests.count <= 1}
          >
            &minus;
          </button>
          <span className="guest-count">{state.guests.count}</span>
          <button
            onClick={() => updateGuestCount(Math.min(lodge.maxGuests, state.guests.count + 1))}
            disabled={state.guests.count >= lodge.maxGuests}
          >
            +
          </button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prevMonth}>&larr;</button>
          <span className="calendar-month">{months[viewMonth]} {viewYear}</span>
          <button className="calendar-nav-btn" onClick={nextMonth}>&rarr;</button>
        </div>

        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(viewYear, viewMonth, day);
            const isDisabled = date < today || date.getMonth() < 4 || date.getMonth() > 8;
            return (
              <button
                key={day}
                className={getDayClass(day)}
                onClick={() => !isDisabled && handleDayClick(day)}
                disabled={isDisabled}
              >
                {day}
              </button>
            );
          })}
        </div>

        {(checkIn || checkOut) && (
          <div className="date-selection-info">
            <div>{t('dates.checkIn')}: <strong>{formatDate(checkIn)}</strong></div>
            <div>{t('dates.checkOut')}: <strong>{formatDate(checkOut)}</strong></div>
            {nightCount > 0 && (
              <>
                <div><strong>{t('dates.nights', { count: nightCount })}</strong></div>
                <div><strong>{new Intl.NumberFormat('sv-SE').format(getLodgePricePerNight(state.guests.count) * nightCount)} SEK</strong></div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="step-nav">
        <div />
        <button
          className="btn btn-primary"
          disabled={!canProceed}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
        >
          {t('dates.nextBtn')} &rarr;
        </button>
      </div>
    </div>
  );
}
