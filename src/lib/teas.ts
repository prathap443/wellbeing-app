// Tea rituals: a calming, caffeine-free tea turned into a short guided pause.
// Wording is deliberately conservative: traditional use and honest evidence labels, no treatment claims.
// Herbs with known risks for people on mental-health medication (St John's wort, kava, valerian,
// ashwagandha) are deliberately not included. Safety text: see docs/TEA_SAFETY_REVIEW.md.

export type Evidence = 'Some small studies' | 'Traditional use';
export type Tea = {
  id: string; title: string; image: number; free: boolean;
  tagline: string; about: string; evidence: Evidence; evidenceNote: string;
  brew: { amount: string; water: string; minutes: number };
  safety: string[];
};

export const GENERAL_SAFETY = [
  'These teas are a calming ritual, not a treatment for anxiety or any other condition.',
  'If you are pregnant, breastfeeding or take regular medication, check with a pharmacist or your GP first.',
  'Stop drinking it if you notice any reaction, such as a rash, itching or stomach upset.',
];

export const TEAS: Tea[] = [
  {
    id: 'chamomile', title: 'Chamomile', image: require('../../assets/content/tea-chamomile.jpg'), free: true,
    tagline: 'Gentle, honeyed, for winding down',
    about: 'One of the most familiar evening teas. Traditionally used to help people relax before sleep.',
    evidence: 'Some small studies', evidenceNote: 'A few small studies of chamomile suggest it may ease mild tension. Most used concentrated extracts rather than tea.',
    brew: { amount: '1 tea bag or 1 to 2 teaspoons of dried flowers', water: 'Freshly boiled water', minutes: 5 },
    safety: ['Avoid if you are allergic to plants in the daisy family, such as ragweed, marigold or echinacea.', 'If you take blood thinners such as warfarin, check with a pharmacist first.'],
  },
  {
    id: 'peppermint', title: 'Peppermint', image: require('../../assets/content/tea-peppermint.jpg'), free: true,
    tagline: 'Fresh and clearing, any time of day',
    about: 'A bright, refreshing tea. Traditionally enjoyed after meals and as a fresh pause in the day.',
    evidence: 'Traditional use', evidenceNote: 'Enjoyed for its fresh taste and aroma. There is little research on peppermint tea for calm itself.',
    brew: { amount: '1 tea bag, or a small handful of fresh leaves', water: 'Freshly boiled water', minutes: 5 },
    safety: ['It can make heartburn or reflux worse in some people.'],
  },
  {
    id: 'lemon-balm', title: 'Lemon balm', image: require('../../assets/content/tea-lemon-balm.jpg'), free: false,
    tagline: 'Soft lemon scent, a calm-focus cup',
    about: 'A lemony herb from the mint family. Traditionally used for a calm, clear-headed feeling.',
    evidence: 'Some small studies', evidenceNote: 'A few small studies of lemon balm suggest it may support calm. Most used extracts rather than tea.',
    brew: { amount: '1 tea bag or 1 to 2 teaspoons of dried leaves', water: 'Freshly boiled water', minutes: 6 },
    safety: ['If you take thyroid medication, check with a pharmacist first.', 'It may add to the effect of sleep or sedative medicines.'],
  },
  {
    id: 'lavender', title: 'Lavender', image: require('../../assets/content/tea-lavender.jpg'), free: false,
    tagline: 'Floral and soothing, best in small amounts',
    about: 'A floral evening tea. Traditionally used to create a soothing, slow-down moment.',
    evidence: 'Traditional use', evidenceNote: 'Research on lavender mostly used concentrated oil capsules, not tea, so it does not apply directly to a cup of lavender tea.',
    brew: { amount: 'Half a teaspoon of food-grade (culinary) dried lavender', water: 'Freshly boiled water', minutes: 5 },
    safety: ['Use only food-grade lavender, never lavender oil or flowers from a florist.', 'A little goes a long way: too much tastes soapy.', 'It may add to the effect of sleep or sedative medicines.'],
  },
  {
    id: 'rooibos', title: 'Rooibos', image: require('../../assets/content/tea-rooibos.jpg'), free: false,
    tagline: 'Warm, rounded, naturally caffeine-free',
    about: 'A red bush tea from South Africa with a mellow, slightly sweet taste. A good caffeine-free swap for a regular cuppa.',
    evidence: 'Traditional use', evidenceNote: 'Valued as a caffeine-free comfort drink. There is little research on it for calm.',
    brew: { amount: '1 tea bag or 1 teaspoon of loose rooibos', water: 'Freshly boiled water', minutes: 6 },
    safety: ['Generally well tolerated. If you have liver problems, check with a pharmacist first.'],
  },
  {
    id: 'linden', title: 'Linden flower', image: require('../../assets/content/tea-linden.jpg'), free: false,
    tagline: 'Light, honey-floral, a quiet evening cup',
    about: 'Made from lime-tree blossoms. A traditional European evening tea for a gentle, quiet moment.',
    evidence: 'Traditional use', evidenceNote: 'A long tradition of use, but very little modern research.',
    brew: { amount: '1 tea bag or 1 to 2 teaspoons of dried blossoms', water: 'Freshly boiled water', minutes: 7 },
    safety: ['If you have a heart condition or take heart medication, check with a pharmacist first.'],
  },
  {
    id: 'ginger-lemon', title: 'Ginger & lemon', image: require('../../assets/content/tea-ginger-lemon.jpg'), free: false,
    tagline: 'Warming and bright, for a cold afternoon',
    about: 'Fresh ginger and lemon in hot water. A warming, comforting cup that is simple to make.',
    evidence: 'Traditional use', evidenceNote: 'Enjoyed for its warmth. Ginger is studied for nausea, not for calm.',
    brew: { amount: '3 to 4 thin slices of fresh ginger and a slice of lemon', water: 'Freshly boiled water', minutes: 7 },
    safety: ['If you take blood thinners or have gallstones, check with a pharmacist first.', 'It can make heartburn worse in some people.'],
  },
  {
    id: 'rose', title: 'Rose petal', image: require('../../assets/content/tea-rose.jpg'), free: false,
    tagline: 'Delicate and fragrant, a gentle treat',
    about: 'A light, fragrant tea made from dried rose petals. A lovely, unhurried cup to slow down with.',
    evidence: 'Traditional use', evidenceNote: 'Enjoyed for its fragrance. There is very little research on it for calm.',
    brew: { amount: '1 tablespoon of food-grade dried rose petals', water: 'Hot water, just off the boil', minutes: 5 },
    safety: ['Use only food-grade petals: roses from florists or gardens may have been sprayed.'],
  },
];

export const TEA_BANNER = require('../../assets/content/banner-tea-rituals.jpg');

/** The guided pause while drinking. Each step moves on when the person is ready. */
export const RITUAL_STEPS = [
  { title: 'Hold the cup', text: 'Wrap both hands around it. Notice the warmth spreading into your palms.' },
  { title: 'Breathe it in', text: 'Bring the cup close and breathe in slowly through your nose. What do you notice in the aroma?' },
  { title: 'A first sip', text: 'Take a small sip and let it rest on your tongue for a moment before you swallow.' },
  { title: 'Look around', text: 'Notice one thing you can see, one thing you can hear, and one thing you can feel.' },
  { title: 'Let go a little', text: 'Take another slow sip. As you breathe out, let your shoulders drop.' },
];
