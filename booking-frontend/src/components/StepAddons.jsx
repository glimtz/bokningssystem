import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';
import { addons } from '../data/packages';

export default function StepAddons() {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();

  const nightCount = state.dates.checkIn && state.dates.checkOut
    ? Math.round((state.dates.checkOut - state.dates.checkIn) / (1000 * 60 * 60 * 24))
    : 0;

  const guestCount = state.guests.count;

  function formatPrice(price) {
    return new Intl.NumberFormat('sv-SE').format(price) + ' SEK';
  }

  // Generate array of stay dates (one per night/day of activity)
  function getStayDates() {
    if (!state.dates.checkIn || !state.dates.checkOut) return [];
    const dates = [];
    const current = new Date(state.dates.checkIn);
    while (current < state.dates.checkOut) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  function formatDateShort(date) {
    const months = t('dates.months');
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function toggleGuideDate(dateStr) {
    const current = state.addons.guide.selectedDates;
    const maxDays = state.addons.guide.days;
    if (current.includes(dateStr)) {
      dispatch({ type: 'SET_GUIDE_DATES', payload: current.filter((d) => d !== dateStr) });
    } else if (current.length < maxDays) {
      dispatch({ type: 'SET_GUIDE_DATES', payload: [...current, dateStr] });
    }
  }

  function getAddonSubtotal(addon) {
    const addonState = state.addons[addon.id];
    if (!addonState.selected) return 0;
    if (addon.type === 'perDay') return addon.price * addonState.days;
    if (addon.type === 'perPerson') return addon.price * guestCount;
    if (addon.type === 'flat') return addon.price;
    return 0;
  }

  function getUnitLabel(addon) {
    const addonT = t(`addons.items.${addon.id}`);
    if (typeof addonT === 'object' && addonT.unit) return addonT.unit;
    if (addon.type === 'perDay') return t('addons.perDay');
    if (addon.type === 'perPerson') return t('addons.perPerson');
    return '';
  }

  const stayDates = getStayDates();
  const guideAddon = state.addons.guide;
  const showGuideDatePicker = guideAddon.selected && guideAddon.days > 0 && guideAddon.days < nightCount;

  return (
    <div>
      <h2 className="step-title">{t('addons.title')}</h2>
      <p className="step-description">{t('addons.description')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {addons.map((addon) => {
          const addonState = state.addons[addon.id];
          const isSelected = addonState.selected;
          const addonT = t(`addons.items.${addon.id}`);
          const name = typeof addonT === 'object' ? addonT.name : addon.name;
          const description = typeof addonT === 'object' ? addonT.description : addon.description;
          const unitLabel = getUnitLabel(addon);
          const isPerDay = addon.type === 'perDay';

          return (
            <div key={addon.id} className="addon-card-wrapper">
              <div
                className={`addon-card ${isSelected ? 'selected' : ''}`}
                onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: addon.id })}
              >
                <div className="addon-checkbox">
                  {isSelected && '\u2713'}
                </div>
                <div className="addon-info">
                  <div className="addon-name">{name}</div>
                  <div className="addon-description">{description}</div>
                  <div className="addon-price">
                    {formatPrice(addon.price)} <span>{unitLabel}</span>
                  </div>
                </div>
              </div>

              {/* Day selector for per-day addons */}
              {isSelected && isPerDay && nightCount > 0 && (
                <div className="addon-day-selector">
                  <label className="addon-day-label">{t('addons.howManyDays')}</label>
                  <div className="day-counter">
                    <button
                      onClick={() => dispatch({
                        type: 'SET_ADDON_DAYS',
                        payload: { addonId: addon.id, days: Math.max(1, addonState.days - 1) },
                      })}
                      disabled={addonState.days <= 1}
                    >
                      &minus;
                    </button>
                    <span className="day-count">
                      {addonState.days} {addonState.days === 1 ? t('addons.day') : t('addons.days')}
                    </span>
                    <button
                      onClick={() => dispatch({
                        type: 'SET_ADDON_DAYS',
                        payload: { addonId: addon.id, days: Math.min(nightCount, addonState.days + 1) },
                      })}
                      disabled={addonState.days >= nightCount}
                    >
                      +
                    </button>
                  </div>
                  <div className="addon-day-total">
                    {formatPrice(addon.price * addonState.days)}
                  </div>
                </div>
              )}

              {/* Per-person subtotal */}
              {isSelected && addon.type === 'perPerson' && (
                <div className="addon-day-selector">
                  <span className="addon-day-label">
                    {guestCount} {guestCount === 1 ? t('addons.guest') : t('addons.guests')}
                  </span>
                  <div className="addon-day-total">
                    {formatPrice(addon.price * guestCount)}
                  </div>
                </div>
              )}

              {/* Flat fee — just show total */}
              {isSelected && addon.type === 'flat' && (
                <div className="addon-day-selector">
                  <span className="addon-day-label">{t('addons.flatFee')}</span>
                  <div className="addon-day-total">
                    {formatPrice(addon.price)}
                  </div>
                </div>
              )}

              {/* Guide date picker */}
              {addon.id === 'guide' && showGuideDatePicker && (
                <div className="guide-date-picker">
                  <label className="addon-day-label">
                    {t('addons.selectWhichDays')} ({guideAddon.selectedDates.length}/{guideAddon.days})
                  </label>
                  <div className="guide-date-grid">
                    {stayDates.map((date) => {
                      const dateStr = toDateString(date);
                      const isChosen = guideAddon.selectedDates.includes(dateStr);
                      const isFull = guideAddon.selectedDates.length >= guideAddon.days && !isChosen;
                      return (
                        <button
                          key={dateStr}
                          className={`guide-date-btn ${isChosen ? 'chosen' : ''} ${isFull ? 'disabled' : ''}`}
                          onClick={() => toggleGuideDate(dateStr)}
                          disabled={isFull}
                        >
                          {formatDateShort(date)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          &larr; {t('addons.prevBtn')}
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_STEP' })}>
          {t('addons.nextBtn')} &rarr;
        </button>
      </div>
    </div>
  );
}
