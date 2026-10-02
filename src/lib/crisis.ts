import { Alert, Linking, Platform } from 'react-native';

export type CrisisLine = {
  name: string;
  description: string;
  display: string;
  url: string;
};

export type CrisisRegion = {
  region: string;
  lines: CrisisLine[];
};

export function smsUrl(number: string, body: string) {
  // iOS and Android use different separators for the message body.
  return `sms:${number}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`;
}

export const CRISIS_REGIONS: CrisisRegion[] = [
  {
    region: 'United Kingdom',
    lines: [
      { name: 'Emergency services', description: 'If you or someone else is in immediate danger', display: '999', url: 'tel:999' },
      { name: 'Samaritans', description: 'Free, 24/7, confidential listening support', display: '116 123', url: 'tel:116123' },
      { name: 'NHS 111 (option 2)', description: 'Urgent mental health help in England', display: '111', url: 'tel:111' },
      { name: 'Shout', description: 'Free 24/7 crisis text service', display: 'Text SHOUT to 85258', url: smsUrl('85258', 'SHOUT') },
    ],
  },
  {
    region: 'Ireland',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '112 / 999', url: 'tel:112' },
      { name: 'Samaritans Ireland', description: 'Free, 24/7 listening support', display: '116 123', url: 'tel:116123' },
    ],
  },
  {
    region: 'United States',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '911', url: 'tel:911' },
      { name: '988 Suicide & Crisis Lifeline', description: 'Call or text, 24/7', display: '988', url: 'tel:988' },
    ],
  },
  {
    region: 'Australia',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '000', url: 'tel:000' },
      { name: 'Lifeline', description: '24/7 crisis support', display: '13 11 14', url: 'tel:131114' },
    ],
  },
  {
    region: 'Canada',
    lines: [
      { name: 'Emergency services', description: 'Immediate danger', display: '911', url: 'tel:911' },
      { name: '9-8-8 Suicide Crisis Helpline', description: 'Call or text, 24/7', display: '988', url: 'tel:988' },
    ],
  },
];

export const FIND_A_HELPLINE_URL = 'https://findahelpline.com';

export async function openCrisisLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open', 'Please dial the number directly from your phone app.');
  }
}
