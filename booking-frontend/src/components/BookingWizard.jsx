import { useBooking } from '../context/BookingContext';
import { useI18n } from '../i18n/I18nContext';
import StepDates from './StepDates';
import StepAddons from './StepAddons';
import StepContact from './StepContact';
import StepSummary from './StepSummary';

const STEPS = [
  { key: 'dates', component: StepDates },
  { key: 'addons', component: StepAddons },
  { key: 'contact', component: StepContact },
  { key: 'summary', component: StepSummary },
];

export default function BookingWizard() {
  const { state } = useBooking();
  const { t } = useI18n();
  const { currentStep } = state;
  const CurrentStepComponent = STEPS[currentStep]?.component;

  return (
    <div>
      <div className="stepper">
        {STEPS.map((step, index) => {
          let className = 'stepper-step';
          if (index === currentStep) className += ' active';
          if (index < currentStep) className += ' completed';

          return (
            <div key={step.key} className={className}>
              <div className="stepper-number">
                {index < currentStep ? '\u2713' : index + 1}
              </div>
              <span className="stepper-label">{t(`stepper.${step.key}`)}</span>
            </div>
          );
        })}
      </div>

      <div className="step-container" key={currentStep}>
        {CurrentStepComponent && <CurrentStepComponent />}
      </div>
    </div>
  );
}
