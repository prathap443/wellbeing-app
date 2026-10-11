import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { MAX_LISTEN_MS, abortListening, addResult, beginTranscript, requestVoicePermission, startListening, stopListening, transcriptText, voiceSupport, type Transcript } from './voice';

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone or speech recognition is switched off for Wellbeing. You can turn it on in the Settings app, or type instead.',
  'language-not-supported': "Voice entry isn't available for your iPhone's language right now. You can type instead.",
  'service-not-allowed': "Voice entry isn't available right now. Check that Siri & Dictation is on in the Settings app, or type instead.",
  'no-speech': "Didn't catch anything. Try again, or type instead.",
  'speech-timeout': "Didn't catch anything. Try again, or type instead.",
  interrupted: 'Recording stopped because another app used the microphone. Your words so far are kept.',
  'audio-capture': "Couldn't use the microphone. Your words so far are kept.",
  busy: 'Voice entry is busy. Please try again in a moment.',
};
const FALLBACK = 'Voice entry stopped unexpectedly. Your words so far are kept.';

/**
 * One recording at a time. start(existingText, onText) adds speech after the existing text and calls
 * onText with the whole field as it updates. Stops by itself after MAX_LISTEN_MS, when the app goes to
 * the background, or when the screen closes.
 */
export function useVoiceCapture() {
  const support = useMemo(voiceSupport, []);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const transcript = useRef<Transcript>(beginTranscript(''));
  const onText = useRef<((t: string) => void) | null>(null);
  const startedAt = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);

  const clearTicker = () => { if (ticker.current) { clearInterval(ticker.current); ticker.current = null; } };
  const finish = useCallback(() => { active.current = false; clearTicker(); setListening(false); setStarting(false); }, []);

  useSpeechRecognitionEvent('start', () => {
    if (!active.current) return;
    setStarting(false); setListening(true);
    startedAt.current = Date.now(); setElapsedMs(0);
    clearTicker();
    ticker.current = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsedMs(ms);
      if (ms >= MAX_LISTEN_MS) stopListening();
    }, 250);
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (!active.current) return;
    const text = e.results?.[0]?.transcript ?? '';
    transcript.current = addResult(transcript.current, text, e.isFinal);
    onText.current?.(transcriptText(transcript.current));
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (!active.current) return;
    if (e.error !== 'aborted') setError(MESSAGES[e.error] ?? FALLBACK);
    finish();
  });
  useSpeechRecognitionEvent('end', () => { if (active.current) finish(); });

  const start = useCallback(async (existing: string, cb: (t: string) => void) => {
    if (!support.ok || active.current) return;
    setError(null);
    if ((await requestVoicePermission()) !== 'granted') { setError(MESSAGES['not-allowed']); return; }
    transcript.current = beginTranscript(existing);
    onText.current = cb;
    active.current = true;
    setStarting(true);
    try { startListening(support.lang); } catch { setError(FALLBACK); finish(); }
  }, [support, finish]);

  const stop = useCallback(() => { if (active.current) stopListening(); }, []);

  // Never keep the microphone on in the background or after leaving the screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active' && active.current) stopListening(); });
    return () => { sub.remove(); if (active.current) abortListening(); clearTicker(); };
  }, []);

  return { support, listening, starting, elapsedMs, error, clearError: () => setError(null), start, stop };
}
