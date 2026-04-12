import { BookingProvider } from './context/BookingContext';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import BookingWizard from './components/BookingWizard';
import LanguageSwitcher from './components/LanguageSwitcher';
import './App.css';

function BookingApp() {
  const { t } = useI18n();
  return (
    <BookingProvider>
      <div className="booking-app">
        <header className="booking-header">
          <LanguageSwitcher />
          <h1 className="booking-title">{t('header.title')}</h1>
          <p className="booking-tagline">{t('header.tagline')}</p>
        </header>
        <BookingWizard />
      </div>
    </BookingProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <BookingApp />
    </I18nProvider>
  );
}

export default App;
