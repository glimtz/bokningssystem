import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';

export default function StepContact() {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();
  const { guests } = state;

  function updateField(field, value) {
    dispatch({ type: 'SET_GUESTS', payload: { [field]: value } });
  }

  const canProceed = guests.name.trim() && guests.email.trim() && guests.phone.trim();

  return (
    <div>
      <h2 className="step-title">{t('contact.title')}</h2>
      <p className="step-description">{t('contact.description')}</p>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name">{t('contact.name')} *</label>
          <input
            id="name"
            type="text"
            placeholder={t('contact.namePlaceholder')}
            value={guests.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">{t('contact.email')} *</label>
          <input
            id="email"
            type="email"
            placeholder={t('contact.emailPlaceholder')}
            value={guests.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">{t('contact.phone')} *</label>
          <input
            id="phone"
            type="tel"
            placeholder={t('contact.phonePlaceholder')}
            value={guests.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>

        <div />

        <div className="form-group full-width">
          <label htmlFor="message">{t('contact.message')}</label>
          <textarea
            id="message"
            placeholder={t('contact.messagePlaceholder')}
            value={guests.message}
            onChange={(e) => updateField('message', e.target.value)}
          />
        </div>
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          &larr; {t('contact.prevBtn')}
        </button>
        <button
          className="btn btn-primary"
          disabled={!canProceed}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
        >
          {t('contact.nextBtn')} &rarr;
        </button>
      </div>
    </div>
  );
}
