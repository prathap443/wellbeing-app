import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSession } from '../lib/session';
import { TEAS, TEA_BANNER } from '../lib/teas';

export default function TeaRitualsScreen() {
  const navigation = useNavigation<any>();
  const { plus } = useSession();
  const { width } = useWindowDimensions();
  const cardW = (Math.min(width, 720) - 20 * 2 - 14) / 2;

  return <ScrollView style={styles.page} contentContainerStyle={styles.container}>
    <View style={styles.banner}>
      <Image source={TEA_BANNER} style={[StyleSheet.absoluteFill, styles.fill]} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.bannerShade} />
      <Text style={styles.bannerTitle}>Tea rituals</Text>
      <Text style={styles.bannerText}>A caffeine-free cup, turned into an unhurried pause.</Text>
    </View>
    <View style={styles.note}>
      <Icon name="information-circle-outline" size={18} color="#93c5fd" />
      <Text style={styles.noteText}>A calming ritual, not a treatment. If you're pregnant, breastfeeding or take regular medication, check with a pharmacist first. Each tea lists its own cautions.</Text>
    </View>
    <View style={styles.grid}>
      {TEAS.map((t) => {
        const locked = !t.free && !plus;
        return <TouchableOpacity key={t.id} style={{ width: cardW }} onPress={() => navigation.navigate('Tea', { id: t.id })}
          accessibilityRole="button" accessibilityLabel={`${t.title}${locked ? ', Plus' : ''}`}>
          <View style={[styles.cover, { height: cardW * 4 / 3 }]}>
            <Image source={t.image} style={[StyleSheet.absoluteFill, styles.fill]} resizeMode="cover" />
            {locked ? <View style={styles.lock}><Icon name="lock-closed" size={13} color="#f8fafc" /><Text style={styles.lockText}>Plus</Text></View>
              : t.free && !plus ? <View style={styles.free}><Text style={styles.freeText}>Free</Text></View> : null}
          </View>
          <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{t.tagline}</Text>
        </TouchableOpacity>;
      })}
    </View>
    {!plus ? <TouchableOpacity style={styles.upsell} onPress={() => navigation.navigate('Subscription')} accessibilityRole="button">
      <Icon name="sparkles-outline" size={20} color="#fcd34d" />
      <Text style={styles.upsellText}>Unlock all tea rituals and soundscapes with Wellbeing Plus</Text>
      <Icon name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' }, // explicit size: otherwise web renders images at their natural pixel size
  page: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  banner: { height: 190, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end', padding: 18 },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,6,23,0.45)' },
  bannerTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '800' },
  bannerText: { color: '#e2e8f0', fontSize: 13, lineHeight: 19, marginTop: 4 },
  note: { flexDirection: 'row', gap: 10, backgroundColor: '#172554', borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 20 },
  noteText: { color: '#dbeafe', fontSize: 13, lineHeight: 19, flex: 1 },
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
