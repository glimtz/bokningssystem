import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';
import { cabins } from '../data/packages';

export default function StepCabin() {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();

  return (
    <div>
      <h2 className="step-title">{t('cabins.title')}</h2>
      <p className="step-description">{t('cabins.description')}</p>

      <div className="card-grid">
        <div
          className={`card ${state.selectedCabin === 'auto' ? 'selected' : ''}`}
          onClick={() => dispatch({ type: 'SET_CABIN', payload: 'auto' })}
        >
          <div className="card-title">{t('cabins.autoTitle')}</div>
          <div className="card-description">{t('cabins.autoDescription')}</div>
          <div className="card-highlights">
            <span className="highlight-tag">{t('cabins.recommended')}</span>
          </div>
        </div>

        {cabins.map((cabin) => {
          const cabinT = t(`cabins.items.${cabin.id}`);
          const name = typeof cabinT === 'object' ? cabinT.name : cabin.name;
          const description = typeof cabinT === 'object' ? cabinT.description : cabin.description;
          const amenities = typeof cabinT === 'object' ? cabinT.amenities : cabin.amenities;

          return (
            <div
              key={cabin.id}
              className={`card ${state.selectedCabin === cabin.id ? 'selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_CABIN', payload: cabin.id })}
            >
              <div className="card-title">{name}</div>
              <div className="card-description">{description}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {t('cabins.beds', { count: cabin.beds })}
              </div>
              <div className="card-highlights">
                {amenities.map((a) => (
                  <span key={a} className="highlight-tag">{a}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          &larr; {t('cabins.prevBtn')}
        </button>
        <button
          className="btn btn-primary"
          disabled={!state.selectedCabin}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
        >
          {t('cabins.nextBtn')} &rarr;
        </button>
      </div>
    </div>
  );
}
