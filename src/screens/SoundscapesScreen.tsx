import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSession } from '../lib/session';
import { SOUNDSCAPES, SOUNDSCAPE_GROUPS, SOUNDSCAPES_BANNER, canPlay } from '../lib/soundscapes';
import { PAUSES } from '../lib/pauses';

export default function SoundscapesScreen() {
  const navigation = useNavigation<any>();
  const { plus } = useSession();
  const { width } = useWindowDimensions();
  const cardW = (Math.min(width, 720) - 20 * 2 - 14) / 2;

  return <ScrollView style={styles.page} contentContainerStyle={styles.container}>
    <View style={styles.banner}>
      <Image source={SOUNDSCAPES_BANNER} style={[StyleSheet.absoluteFill, styles.fill]} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.bannerShade} />
      <Text style={styles.bannerTitle}>Soundscapes</Text>
      <Text style={styles.bannerText}>Original sounds to calm, focus and sleep. Set a timer and let them play with your screen locked.</Text>
    </View>
    <Text style={styles.group}>Short pauses</Text>
    <Text style={styles.pausesIntro}>12-second calm videos with a few kind words. Free for everyone.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pausesRow}>
      {PAUSES.map((p) => <TouchableOpacity key={p.id} style={styles.pauseItem} onPress={() => navigation.navigate('Pause', { id: p.id })} accessibilityRole="button" accessibilityLabel={`Pause video: ${p.title}`}>
        <Image source={p.poster} style={styles.pausePoster} resizeMode="cover" />
        <Text style={styles.pauseTitle} numberOfLines={2}>{p.title}</Text>
      </TouchableOpacity>)}
    </ScrollView>
    {SOUNDSCAPE_GROUPS.map((group) => <View key={group}>
      <Text style={styles.group}>{group}</Text>
      <View style={styles.grid}>
        {SOUNDSCAPES.filter((s) => s.group === group).map((s) => {
          const locked = !canPlay(s, plus);
          return <TouchableOpacity key={s.id} style={{ width: cardW }} onPress={() => navigation.navigate(locked ? 'Subscription' : 'SoundscapePlayer', locked ? undefined : { id: s.id })}
            accessibilityRole="button" accessibilityLabel={`${s.title}${locked ? ', Plus' : ''}`}>
            <View style={[styles.cover, { height: cardW * 4 / 3 }]}>
              <Image source={s.image} style={[StyleSheet.absoluteFill, styles.fill]} resizeMode="cover" />
              {locked ? <View style={styles.lock}><Icon name="lock-closed" size={13} color="#f8fafc" /><Text style={styles.lockText}>Plus</Text></View>
                : s.free && !plus ? <View style={styles.free}><Text style={styles.freeText}>Free</Text></View> : null}
            </View>
            <Text style={styles.title} numberOfLines={1}>{s.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{s.subtitle}</Text>
          </TouchableOpacity>;
        })}
      </View>
    </View>)}
    {!plus ? <TouchableOpacity style={styles.upsell} onPress={() => navigation.navigate('Subscription')} accessibilityRole="button">
      <Icon name="sparkles-outline" size={20} color="#fcd34d" />
      <Text style={styles.upsellText}>Unlock all soundscapes and tea rituals with Wellbeing Plus</Text>
      <Icon name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  pausesIntro: { color: '#94a3b8', fontSize: 13, marginTop: -6, marginBottom: 12 },
  pausesRow: { gap: 12, paddingRight: 8 },
  pauseItem: { width: 112 },
  pausePoster: { width: 112, height: 199, borderRadius: 16, backgroundColor: '#1e293b' },
  pauseTitle: { color: '#e2e8f0', fontSize: 13, fontWeight: '700', marginTop: 6, lineHeight: 17 },
  fill: { width: '100%', height: '100%' }, // explicit size: otherwise web renders images at their natural pixel size
  page: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  banner: { height: 190, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end', padding: 18 },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,6,23,0.35)' },
  bannerTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '800' },
  bannerText: { color: '#e2e8f0', fontSize: 13, lineHeight: 19, marginTop: 4 },
  group: { color: '#f8fafc', fontSize: 19, fontWeight: '800', marginTop: 26, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cover: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#1e293b' },
  lock: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.75)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  lockText: { color: '#f8fafc', fontSize: 11, fontWeight: '800' },
  free: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  freeText: { color: '#022c22', fontSize: 11, fontWeight: '800' },
  title: { color: '#f8fafc', fontWeight: '800', fontSize: 15, marginTop: 8 },
  subtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginTop: 2 },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 26 },
  upsellText: { color: '#e2e8f0', flex: 1, fontWeight: '700', lineHeight: 20 },
});
