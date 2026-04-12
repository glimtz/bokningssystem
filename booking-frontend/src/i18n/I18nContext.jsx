import { createContext, useContext, useState, useCallback } from 'react';
import en from './en';
import sv from './sv';
import de from './de';
import fr from './fr';

const I18nContext = createContext();

const LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧', translations: en },
  sv: { label: 'Svenska', flag: '🇸🇪', translations: sv },
  de: { label: 'Deutsch', flag: '🇩🇪', translations: de },
  fr: { label: 'Français', flag: '🇫🇷', translations: fr },
};

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('en');

  const t = useCallback(
    (key, replacements = {}) => {
      const translations = LANGUAGES[locale]?.translations || en;
      let text = getNestedValue(translations, key) || getNestedValue(en, key) || key;

      // Support simple {{variable}} replacements
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });

      return text;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
