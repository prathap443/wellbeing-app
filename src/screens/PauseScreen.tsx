import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons as Icon } from '@expo/vector-icons';
import { PAUSES, pauseUrl, todaysPause } from '../lib/pauses';
import { useActivitySession } from '../lib/useActivitySession';
import FeedbackCard from '../components/FeedbackCard';

/** A short calm video. Tap to play or pause; the words are always shown underneath (works on silent). */
export default function PauseScreen() {
  const { id } = (useRoute<any>().params ?? {}) as { id?: string };
  const pause = PAUSES.find((p) => p.id === id) ?? todaysPause();
  const { width, height } = useWindowDimensions();
  const videoW = Math.min(width - 40, 420, (height * 0.62) * 9 / 16);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const session = useActivitySession('pause');

  // useCaching: after the first watch the video plays from the phone, without downloading again.
  const player = useVideoPlayer({ uri: pauseUrl(pause.id), useCaching: true }, (p) => { p.loop = false; });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => { setEnded(true); session.finish(); });
    return () => sub.remove();
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps

  const safely = (fn: () => void) => { try { fn(); } catch { /* player released while leaving the screen */ } };
  const toggle = () => safely(() => {
    if (status !== 'readyToPlay') return;
    if (isPlaying) { player.pause(); session.pause(); return; }
    if (ended) { player.currentTime = 0; setEnded(false); }
    setStarted(true); session.begin(); player.play();
  });
  const retry = () => safely(() => { setEnded(false); setAttempt((n) => n + 1); player.replace({ uri: `${pauseUrl(pause.id)}&r=${attempt + 1}`, useCaching: true }); });

  return <ScrollView style={styles.page} contentContainerStyle={styles.container}>
    <Pressable onPress={toggle} style={[styles.frame, { width: videoW, height: videoW * 16 / 9 }]} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause video' : `Play: ${pause.title}`}>
      <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
      {!isPlaying ? <View style={styles.overlay} pointerEvents="none">
        {!started || ended ? <Image source={pause.poster} style={[StyleSheet.absoluteFill, styles.fill, ended && styles.dim]} accessibilityIgnoresInvertColors /> : null}
        {status === 'loading' || status === 'idle' ? <ActivityIndicator color="#f8fafc" size="large" />
          : status === 'error' ? null
          : <View style={styles.playButton}><Icon name={ended ? 'refresh' : 'play'} size={34} color="#0f172a" style={ended ? undefined : { marginLeft: 4 }} /></View>}
      </View> : null}
    </Pressable>

    {status === 'error' ? <View style={styles.errorRow}>
      <Icon name="cloud-offline-outline" size={18} color="#fca5a5" />
      <Text style={styles.errorText}>Couldn't load this video. Check your connection.</Text>
      <TouchableOpacity onPress={retry} accessibilityRole="button"><Text style={styles.retry}>Retry</Text></TouchableOpacity>
    </View> : null}

    <Text style={styles.title}>{pause.title}</Text>
    <Text style={styles.words} accessibilityLabel={`Words: ${pause.words}`}>{pause.words}</Text>
    {ended && session.finishedId ? <FeedbackCard key={session.finishedId} sessionId={session.finishedId} /> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0f172a' },
  container: { alignItems: 'center', padding: 20, paddingBottom: 48 },
  frame: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#1e293b' },
  fill: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.55 },
  playButton: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(248,250,252,0.92)', alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, maxWidth: 420 },
  errorText: { color: '#fecaca', flexShrink: 1 }, retry: { color: '#93c5fd', fontWeight: '800' },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  words: { color: '#cbd5e1', fontSize: 16, lineHeight: 24, marginTop: 10, textAlign: 'center', maxWidth: 420 },
});
