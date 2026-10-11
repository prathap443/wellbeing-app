import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

// Voice entry for the journal. Speech is turned into text ON THE IPHONE only:
// - the audio is never saved and never sent to our server or anyone else;
// - if this iPhone can't transcribe on-device for its language, voice entry stays off (no silent
//   fallback to Apple's servers, which the speech library would otherwise do).


export type VoiceSupport =
  | { ok: true; lang: string }
  | { ok: false; reason: 'platform' | 'unsupported' };

/** The language the recogniser should use: the phone's own language, so it matches the on-device check. */
export function deviceLang(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().locale || 'en-GB'; } catch { return 'en-GB'; }
}

/** Whether voice entry can run here, privately. iPhone only (the browser preview would send audio to Google). */
export function voiceSupport(): VoiceSupport {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'platform' };
  try {
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return { ok: false, reason: 'unsupported' };
    return { ok: true, lang: deviceLang() };
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
}

export async function requestVoicePermission(): Promise<'granted' | 'denied'> {
  try {
    const r = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return r.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export function startListening(lang: string) {
  ExpoSpeechRecognitionModule.start({
    lang,
    interimResults: true,
    continuous: true,
    requiresOnDeviceRecognition: true,
    addsPunctuation: true,
    iosTaskHint: 'dictation',
  });
}
export function stopListening() { try { ExpoSpeechRecognitionModule.stop(); } catch { /* not running */ } }
export function abortListening() { try { ExpoSpeechRecognitionModule.abort(); } catch { /* not running */ } }

export * from './voiceText';
