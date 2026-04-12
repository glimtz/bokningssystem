import { useI18n } from '../i18n/I18nContext';

export default function LanguageSwitcher() {
  const { locale, setLocale, languages } = useI18n();

  return (
    <div className="language-switcher">
      {Object.entries(languages).map(([code, lang]) => (
        <button
          key={code}
          className={`lang-btn ${locale === code ? 'active' : ''}`}
          onClick={() => setLocale(code)}
          title={lang.label}
        >
          <span className="lang-flag">{lang.flag}</span>
          <span className="lang-code">{code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
