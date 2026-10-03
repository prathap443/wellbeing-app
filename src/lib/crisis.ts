import { Alert, Linking, Platform } from 'react-native';

export type CrisisLine = {
  name: string;
  description: string;
  display: string;
  url: string;
};

export type CrisisRegion = {
  /** ISO 3166 country code, used to open on the user's own country. */
  code: string;
  region: string;
  lines: CrisisLine[];
};

export function smsUrl(number: string, body: string) {
  // iOS and Android use different separators for the message body.
  return `sms:${number}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`;
}

export const CRISIS_REGIONS: CrisisRegion[] = [
  {
    code: 'GB',
    region: 'United Kingdom',
    lines: [
      { name: 'Emergency services', description: 'If you or someone else is in immediate danger', display: '999', url: 'tel:999' },
      { name: 'Samaritans', description: 'Free, 24/7, confidential listening support', display: '116 123', url: 'tel:116123' },
      { name: 'NHS 111 (option 2)', description: 'Urgent mental health help in England', display: '111', url: 'tel:111' },
      { name: 'Shout', description: 'Free 24/7 crisis text service', display: 'Text SHOUT to 85258', url: smsUrl('85258', 'SHOUT') },
    ],
  },
  {
    code: 'IE',
    region: 'Ireland',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '112 / 999', url: 'tel:112' },
      { name: 'Samaritans Ireland', description: 'Free, 24/7 listening support', display: '116 123', url: 'tel:116123' },
    ],
  },
  {
    code: 'US',
    region: 'United States',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '911', url: 'tel:911' },
      { name: '988 Suicide & Crisis Lifeline', description: 'Call or text, 24/7', display: '988', url: 'tel:988' },
    ],
  },
  {
    code: 'CA',
    region: 'Canada',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '911', url: 'tel:911' },
      { name: '9-8-8 Suicide Crisis Helpline', description: 'Call or text, 24/7', display: '988', url: 'tel:988' },
    ],
  },
  {
    code: 'AU',
    region: 'Australia',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '000', url: 'tel:000' },
      { name: 'Lifeline', description: '24/7 crisis support', display: '13 11 14', url: 'tel:131114' },
    ],
  },
  {
    // Source: TelefonSeelsorge national numbers (Diakonie Deutschland, telefonseelsorge.de).
    code: 'DE',
    region: 'Germany',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '112', url: 'tel:112' },
      { name: 'TelefonSeelsorge', description: 'Free, 24/7, anonymous (German)', display: '0800 111 0 111', url: 'tel:08001110111' },
      { name: 'TelefonSeelsorge (second line)', description: 'Free, 24/7, anonymous (German)', display: '0800 111 0 222', url: 'tel:08001110222' },
    ],
  },
  {
    // Source: 143.ch – Die Dargebotene Hand (national association).
    code: 'CH',
    region: 'Switzerland',
    lines: [
      { name: 'Ambulance', description: 'Immediate danger (112 also works)', display: '144', url: 'tel:144' },
      { name: 'Tel 143 – Die Dargebotene Hand', description: '24/7, anonymous listening support', display: '143', url: 'tel:143' },
      { name: 'Tel 143 in English', description: 'English-language support, 6–11 pm', display: '0800 143 000', url: 'tel:0800143000' },
    ],
  },
  {
    // Source: livslinien.dk (phone hours 09:00–05:00 from 1 July 2026).
    code: 'DK',
    region: 'Denmark',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '112', url: 'tel:112' },
      { name: 'Livslinien', description: 'Anonymous crisis line, daily 9 am–5 am (Danish)', display: '70 201 201', url: 'tel:70201201' },
    ],
  },
  {
    // Source: 116sos.pl national support line list.
    code: 'PL',
    region: 'Poland',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '112', url: 'tel:112' },
      { name: 'Kryzysowy Telefon Zaufania', description: 'Free, 24/7 crisis line for adults (Polish)', display: '116 123', url: 'tel:116123' },
      { name: 'Centrum Wsparcia', description: 'Free, 24/7 support in a mental health crisis (Polish)', display: '800 70 2222', url: 'tel:800702222' },
    ],
  },
  {
    // Source: Tele-MANAS, Ministry of Health and Family Welfare (telemanas.mohfw.gov.in).
    code: 'IN',
    region: 'India',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '112', url: 'tel:112' },
      { name: 'Tele-MANAS', description: 'Free, 24/7 government mental health helpline, many languages', display: '14416', url: 'tel:14416' },
    ],
  },
];

export const FIND_A_HELPLINE_URL = 'https://findahelpline.com';

/** Opens on the user's own country when we have it (from the device's region setting), otherwise the UK. */
export function defaultRegionIndex(): number {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const country = (locale.split(/[-_]/).find((part, i) => i > 0 && /^[A-Za-z]{2}$/.test(part)) || '').toUpperCase();
    const index = CRISIS_REGIONS.findIndex((r) => r.code === country);
    return index >= 0 ? index : 0;
  } catch {
    return 0;
  }
}

export async function openCrisisLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open', 'Please dial the number directly from your phone app.');
  }
}
