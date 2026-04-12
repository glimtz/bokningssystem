export const lodge = {
  name: 'Vilhelmina Lodge',
  nickname: 'Northern Light Lodge',
  maxGuests: 8,
  pricePerPersonPerNight: 950,
  minPricePerNight: 4000,
  description: 'Exclusive lodge by the Vojmån river, north of Vilhelmina.',
  features: ['Main cabin', 'Sleeping cabin', 'Relaxation & sauna cabin', 'BBQ area'],
};

// Helper: calculate lodge price per night based on guest count
export function getLodgePricePerNight(guestCount) {
  return Math.max(lodge.pricePerPersonPerNight * guestCount, lodge.minPricePerNight);
}

export const addons = [
  {
    id: 'boat',
    name: 'Boat rental',
    description: 'Alloycraft J370 with 10 hp outboard motor. Trailer included.',
    price: 1000,
    type: 'perDay',
  },
  {
    id: 'guide',
    name: 'Fishing guide',
    description: 'Full day with a private fishing guide. Lunch included.',
    price: 8000,
    type: 'perDay',
  },
  {
    id: 'linens',
    name: 'Bed linens & towels',
    description: 'Fresh bed linens and towels for each guest.',
    price: 150,
    type: 'perPerson',
  },
  {
    id: 'cleaning',
    name: 'Final cleaning',
    description: 'Professional cleaning after your stay.',
    price: 1200,
    type: 'flat',
  },
];
