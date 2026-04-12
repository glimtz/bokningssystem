import { createContext, useContext, useReducer } from 'react';

const BookingContext = createContext();

const initialState = {
  currentStep: 0,
  dates: { checkIn: null, checkOut: null },
  addons: {
    boat: { selected: false, days: 0 },
    guide: { selected: false, days: 0, selectedDates: [] },
    linens: { selected: false },
    cleaning: { selected: false },
  },
  guests: {
    count: 2,
    name: '',
    email: '',
    phone: '',
    message: '',
  },
};

function bookingReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case 'SET_DATES':
      return {
        ...state,
        dates: action.payload,
        // Reset day-based addon selections when dates change
        addons: {
          ...state.addons,
          boat: { ...state.addons.boat, days: 0 },
          guide: { ...state.addons.guide, days: 0, selectedDates: [] },
        },
      };
    case 'TOGGLE_ADDON': {
      const addonId = action.payload;
      const current = state.addons[addonId];
      if (current.selected) {
        // Turn off — reset everything
        const reset = { selected: false };
        if ('days' in current) reset.days = 0;
        if ('selectedDates' in current) reset.selectedDates = [];
        return { ...state, addons: { ...state.addons, [addonId]: reset } };
      }
      // Turn on
      const on = { ...current, selected: true };
      if ('days' in current) on.days = 1;
      return { ...state, addons: { ...state.addons, [addonId]: on } };
    }
    case 'SET_ADDON_DAYS': {
      const { addonId, days } = action.payload;
      const addon = state.addons[addonId];
      const update = { ...addon, days };
      if (addonId === 'guide') {
        update.selectedDates = [];
      }
      return { ...state, addons: { ...state.addons, [addonId]: update } };
    }
    case 'SET_GUIDE_DATES': {
      return {
        ...state,
        addons: {
          ...state.addons,
          guide: { ...state.addons.guide, selectedDates: action.payload },
        },
      };
    }
    case 'SET_GUESTS':
      return { ...state, guests: { ...state.guests, ...action.payload } };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
