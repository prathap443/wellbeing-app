import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useRoute } from '@react-navigation/native';
import FeedbackCard from '../components/FeedbackCard';
import { useActivitySession } from '../lib/useActivitySession';
import type { Feeling } from '../lib/activity';

type Session = { id: string; title: string; minutes: number; category: string; color: string; icon: string; prompt: string };

const SESSIONS: Session[] = [
  { id: 'arrive', title: 'Arrive here', minutes: 3, category: 'Reset', color: '#60a5fa', icon: 'compass-outline', prompt: 'Notice your breathing. You do not need to change anything. Let your shoulders soften and return your attention to this one moment.' },
  { id: 'release', title: 'Release the day', minutes: 5, category: 'Stress', color: '#a78bfa', icon: 'cloud-outline', prompt: 'Name one thing you are carrying. Imagine placing it down for the next few minutes. You can return to it later, but not right now.' },
  { id: 'sleep', title: 'Ease into rest', minutes: 7, category: 'Sleep', color: '#818cf8', icon: 'moon-outline', prompt: 'Let your breath become unhurried. Scan from forehead to toes, inviting each area to settle without forcing sleep.' },
  { id: 'kindness', title: 'A kinder inner voice', minutes: 5, category: 'Self-compassion', color: '#f472b6', icon: 'heart-outline', prompt: 'Think of a difficult moment. Offer yourself the same words you would offer someone you care about.' },
];

// Arriving from "What helps me?": "can't switch off" opens on Release the day; otherwise the shortest practice.
const initialSession = (feeling?: Feeling) => (feeling === 'cant_switch_off' ? SESSIONS.find((s) => s.id === 'release') : undefined) ?? SESSIONS[0];

export default function MeditationScreen() {
  const params = (useRoute<any>().params ?? {}) as { feeling?: Feeling };
  const session = useActivitySession('meditation', params.feeling);
  const [selected, setSelected] = useState<Session>(() => initialSession(params.feeling));
  const [remaining, setRemaining] = useState(() => initialSession(params.feeling).minutes * 60);
  const [playing, setPlaying] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [completed, setCompleted] = useState(0);
  const player = useAudioPlayer(require('../../assets/audio/meditation-music.mp3'));

  useEffect(() => {
    const load = async () => {
      const [storedFavourites, storedCompleted] = await Promise.all([AsyncStorage.getItem('meditation_favourites'), AsyncStorage.getItem('meditation_completed')]);
      if (storedFavourites) setFavourites(JSON.parse(storedFavourites));
      if (storedCompleted) setCompleted(Number(storedCompleted));
    };
    load();
  }, []);

  // The audio library releases the native player when this screen closes, which also stops the sound.
  // Calling the player after that throws, so every call goes through these guards and the screen
  // never calls pause() in its own cleanup (that crashed the app when tapping back mid-practice).
  const pauseAudio = () => { try { player.pause(); } catch { /* player already released */ } };
  const playAudio = () => { try { player.play(); } catch { /* player already released */ } };

  useEffect(() => {
    try { player.loop = true; player.volume = 0.45; } catch { /* player already released */ }
  }, [player]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setRemaining((current) => {
      if (current > 1) return current - 1;
      setPlaying(false);
      pauseAudio();
      setTimeout(session.finish, 0); // timer reached the end: a finished session
      setCompleted((currentCompleted) => {
        const next = currentCompleted + 1;
        AsyncStorage.setItem('meditation_completed', String(next));
        return next;
      });
      return selected.minutes * 60;
    }), 1000);
    return () => clearInterval(interval);
  }, [playing, player, selected]);

  const chooseSession = (next: Session) => { pauseAudio(); setPlaying(false); session.abandon(); setSelected(next); setRemaining(next.minutes * 60); };
  const toggleFavourite = async () => { const next = favourites.includes(selected.id) ? favourites.filter((id) => id !== selected.id) : [...favourites, selected.id]; setFavourites(next); await AsyncStorage.setItem('meditation_favourites', JSON.stringify(next)); };
  const togglePractice = () => {
    if (playing) {
      session.pause();
      pauseAudio();
      setPlaying(false);
    } else {
      session.begin();
      playAudio();
      setPlaying(true);
    }
  };
  const time = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  return <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Icon name="headset-outline" size={30} color="#c4b5fd" /><Text style={styles.title}>Meditation studio</Text><Text style={styles.subtitle}>Original guided practices for the moment you are in.</Text></View>
    <View style={[styles.player, { backgroundColor: selected.color + '25', borderColor: selected.color + '70' }]}>
      <View style={styles.playerTop}><View style={[styles.sessionIcon, { backgroundColor: selected.color + '30' }]}><Icon name={selected.icon as any} size={28} color={selected.color} /></View><TouchableOpacity onPress={toggleFavourite}><Icon name={favourites.includes(selected.id) ? 'heart' : 'heart-outline'} size={25} color={favourites.includes(selected.id) ? '#fb7185' : '#cbd5e1'} /></TouchableOpacity></View>
      <Text style={styles.category}>{selected.category.toUpperCase()}</Text><Text style={styles.playerTitle}>{selected.title}</Text><Text style={styles.prompt}>{selected.prompt}</Text>
      <Text style={styles.timer}>{time}</Text><TouchableOpacity style={[styles.playButton, { backgroundColor: selected.color }]} onPress={togglePractice}><Icon name={playing ? 'pause-outline' : 'play-outline'} size={21} color="#fff" /><Text style={styles.playText}>{playing ? 'Pause' : 'Begin practice'}</Text></TouchableOpacity>
    </View>
    <View style={styles.stats}><Icon name="checkmark-circle-outline" size={21} color="#5eead4" /><Text style={styles.statsText}>{completed} practices completed</Text></View>
    {session.finishedId ? <FeedbackCard key={session.finishedId} sessionId={session.finishedId} /> : null}
    <Text style={styles.sectionTitle}>Choose a practice</Text>
    {SESSIONS.map((session) => <TouchableOpacity key={session.id} style={[styles.session, selected.id === session.id && { borderColor: session.color }]} onPress={() => chooseSession(session)}><View style={[styles.listIcon, { backgroundColor: session.color + '22' }]}><Icon name={session.icon as any} size={21} color={session.color} /></View><View style={styles.sessionInfo}><Text style={styles.sessionTitle}>{session.title}</Text><Text style={styles.sessionMeta}>{session.category} - {session.minutes} min</Text></View><Icon name="chevron-forward-outline" size={19} color="#64748b" /></TouchableOpacity>)}
    <View style={styles.audioNote}><Icon name="musical-notes-outline" size={20} color="#93c5fd" /><View style={styles.audioNoteContent}><Text style={styles.audioNoteTitle}>Ambient sound</Text><Text style={styles.audioNoteText}>A soft, calming soundscape plays gently when you begin a practice.</Text></View></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  player: { borderRadius: 20, borderWidth: 1, padding: 20 }, playerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sessionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, category: { color: '#cbd5e1', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 19 }, playerTitle: { color: '#f8fafc', fontSize: 23, fontWeight: '700', marginTop: 5 }, prompt: { color: '#cbd5e1', lineHeight: 21, marginTop: 12 }, timer: { color: '#f8fafc', textAlign: 'center', fontSize: 42, fontWeight: '700', marginTop: 22 }, playButton: { flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center', borderRadius: 25, paddingVertical: 14, marginTop: 14 }, playText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#12372f', borderRadius: 13, padding: 13, marginTop: 14 }, statsText: { color: '#a7f3d0', fontWeight: '600' }, sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 }, session: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', borderRadius: 15, padding: 14, marginBottom: 10 }, listIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, sessionInfo: { flex: 1 }, sessionTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' }, sessionMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  audioNote: { flexDirection: 'row', gap: 11, borderWidth: 1, borderColor: '#334155', borderRadius: 15, padding: 15, marginTop: 14 }, audioNoteContent: { flex: 1 }, audioNoteTitle: { color: '#dbeafe', fontWeight: '700' }, audioNoteText: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 4 },
});
