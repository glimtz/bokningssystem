import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';
import { packages } from '../data/packages';

export default function StepPackage() {
  const { state, dispatch } = useBooking();
  const { t } = useI18n();

  function formatPrice(price) {
    if (!price) return t('packages.priceOnRequest');
    return new Intl.NumberFormat('sv-SE').format(price) + ' kr';
  }

  return (
    <div>
      <h2 className="step-title">{t('packages.title')}</h2>
      <p className="step-description">{t('packages.description')}</p>

      <div className="card-grid">
        {packages.map((pkg) => {
          const pkgT = t(`packages.items.${pkg.id}`);
          const name = typeof pkgT === 'object' ? pkgT.name : pkg.name;
          const description = typeof pkgT === 'object' ? pkgT.description : pkg.description;
          const highlights = typeof pkgT === 'object' ? pkgT.highlights : pkg.highlights;

          return (
            <div
              key={pkg.id}
              className={`card ${state.selectedPackage === pkg.id ? 'selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_PACKAGE', payload: pkg.id })}
            >
              <div className="card-title">{name}</div>
              <div className="card-description">{description}</div>
              <div className="card-price">
                {formatPrice(pkg.price)}
                {pkg.perPerson && pkg.price && <span> {t('packages.perPerson')}</span>}
              </div>
              {pkg.nights && (
                <div style={{ fontSize: '0.85rem', color: 'var(--fm-text-muted)', marginTop: '0.25rem' }}>
                  {t('packages.nightsCount', { count: pkg.nights })}
                </div>
              )}
              <div className="card-highlights">
                {highlights.map((h) => (
                  <span key={h} className="highlight-tag">{h}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="step-nav">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          &larr; {t('packages.prevBtn')}
        </button>
        <button
          className="btn btn-primary"
          disabled={!state.selectedPackage}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
        >
          {t('packages.nextBtn')} &rarr;
        </button>
      </div>
    </div>
  );
}
