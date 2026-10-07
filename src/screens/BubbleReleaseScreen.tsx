import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';

// Bubble Release: a calm, no-fail game. Bubbles drift up; tap to release them.
// A slow breathing circle in the background paces you without asking you to do anything.
// No score to beat, no speed-up, no losing. After 3 minutes it offers a gentle stopping point.

const NATIVE = Platform.OS !== 'web';
const SESSION_SECONDS = 180;
const MAX_BUBBLES = 14;
const COLORS = ['#6ee7b7', '#7dd3fc', '#c4b5fd', '#fda4af', '#fcd34d'];
const BREATHE_IN_MS = 4000;
const BREATHE_OUT_MS = 6000;

type BubbleSpec = { id: number; x: number; size: number; color: string; duration: number; sway: number; swayMs: number; startAt: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const withAlpha = (hex: string, alpha: number) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

function Bubble({ spec, height, calm, onGone, onPop }: { spec: BubbleSpec; height: number; calm: boolean; onGone: (id: number) => void; onPop: (id: number) => void }) {
  const rise = useRef(new Animated.Value(spec.startAt)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const popped = useRef(false);

  useEffect(() => {
    const riseAnim = Animated.timing(rise, { toValue: 1, duration: Math.round(spec.duration * (1 - spec.startAt)), easing: Easing.linear, useNativeDriver: NATIVE });
    const swayAnim = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: spec.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      Animated.timing(sway, { toValue: -1, duration: spec.swayMs * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      Animated.timing(sway, { toValue: 0, duration: spec.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
    ]));
    riseAnim.start(({ finished }) => { if (finished && !popped.current) onGone(spec.id); });
    if (!calm) swayAnim.start();
    return () => { riseAnim.stop(); swayAnim.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const release = () => {
    if (popped.current) return;
    popped.current = true;
    onPop(spec.id);
    Animated.timing(pop, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start(() => onGone(spec.id));
  };

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [height + spec.size, -spec.size * 1.5] });
  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-spec.sway, spec.sway] });
  // Fade in at the bottom and out near the top, so bubbles never pop in or vanish abruptly.
  const fade = rise.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const bodyOpacity = Animated.multiply(fade, pop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }));
  const bodyScale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringScale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const ringOpacity = pop.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });
  const s = spec.size;

  return <Animated.View pointerEvents="box-none" style={[styles.bubbleWrap, { left: spec.x, width: s, height: s, transform: [{ translateY }, { translateX }] }]}>
    <Animated.View pointerEvents="none" style={[styles.ring, { width: s, height: s, borderRadius: s / 2, borderColor: spec.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
    <Animated.View style={{ opacity: bodyOpacity, transform: [{ scale: bodyScale }] }}>
      {/* Core touch responder: fires on the first touch, even though the bubble is moving (Pressable did not on web). */}
      <View onStartShouldSetResponder={() => true} onResponderGrant={release} accessible accessibilityRole="button" accessibilityLabel="Bubble. Tap to release." onAccessibilityTap={release}>
        <View style={[styles.bubble, NATIVE && { shadowColor: spec.color }, { width: s, height: s, borderRadius: s / 2, borderColor: withAlpha(spec.color, 0.95), backgroundColor: withAlpha(spec.color, 0.30) }]}>
          <View style={{ width: s * 0.62, height: s * 0.62, borderRadius: s * 0.31, backgroundColor: withAlpha(spec.color, 0.32) }} />
          <View style={[styles.shine, { width: s * 0.24, height: s * 0.16, borderRadius: s * 0.12, top: s * 0.16, left: s * 0.2 }]} />
          <View style={[styles.shineSmall, { width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, top: s * 0.36, left: s * 0.16 }]} />
        </View>
      </View>
    </Animated.View>
  </Animated.View>;
}

export default function BubbleReleaseScreen() {
  const navigation = useNavigation<any>();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [bubbles, setBubbles] = useState<BubbleSpec[]>([]);
  const [released, setReleased] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [calm, setCalm] = useState(false);
  const nextId = useRef(1);
  const breath = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(1)).current;
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((on) => mounted.current && setCalm(on)).catch(() => undefined); }, []);

  // Breathing circle: in for 4 seconds, out for 6.
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: BREATHE_IN_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      Animated.timing(breath, { toValue: 0, duration: BREATHE_OUT_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
    ]));
    loop.start();
    let inPhase = true;
    let timer: ReturnType<typeof setTimeout>;
    const flip = () => { inPhase = !inPhase; if (mounted.current) setPhase(inPhase ? 'in' : 'out'); timer = setTimeout(flip, inPhase ? BREATHE_IN_MS : BREATHE_OUT_MS); };
    timer = setTimeout(flip, BREATHE_IN_MS);
    Animated.timing(hint, { toValue: 0, duration: 1200, delay: 6000, useNativeDriver: NATIVE }).start();
    return () => { loop.stop(); clearTimeout(timer); };
  }, [breath, hint]);

  // Gentle, steady stream of bubbles. Never speeds up.
  useEffect(() => {
    if (!area.width || finished) return;
    const make = (startAt: number): BubbleSpec => {
      const size = Math.round(rand(46, 92));
      return {
        id: nextId.current++,
        x: rand(8, Math.max(9, area.width - size - 8)),
        size,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        duration: Math.round(rand(calm ? 15000 : 9000, calm ? 20000 : 14000)),
        sway: rand(8, 22),
        swayMs: Math.round(rand(1400, 2200)),
        startAt,
      };
    };
    const spawn = () => setBubbles((current) => (current.length >= MAX_BUBBLES ? current : [...current, make(0)]));
    // Open with a few bubbles already mid-way up, so the screen is alive straight away.
    setBubbles((current) => (current.length ? current : [0.12, 0.3, 0.45, 0.6, 0.72].map((at) => make(at))));
    const id = setInterval(spawn, calm ? 1500 : 950);
    return () => clearInterval(id);
  }, [area.width, finished, calm]);

  // Session clock; pauses while the "nice reset" card is showing.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setElapsed((e) => {
      const next = e + 1;
      if (next >= SESSION_SECONDS && mounted.current) setFinished(true);
      return next;
    }), 1000);
    return () => clearInterval(id);
  }, [finished]);

  const onGone = useCallback((id: number) => { if (mounted.current) setBubbles((c) => c.filter((b) => b.id !== id)); }, []);
  const onPop = useCallback(() => { if (mounted.current) setReleased((r) => r + 1); }, []);
  const onLayout = (e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setArea({ width, height }); };

  const keepGoing = () => { setElapsed(0); setFinished(false); };
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.12] });
  const breathGlow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.36] });
  const progress = Math.min(1, elapsed / SESSION_SECONDS);

  return <View style={styles.container}>
    {[0, 1, 2].map((i) => <View key={`a${i}`} pointerEvents="none" style={[styles.glowA, { transform: [{ scale: 1 - i * 0.25 }], opacity: 0.06 + i * 0.03 }]} />)}
    {[0, 1, 2].map((i) => <View key={`b${i}`} pointerEvents="none" style={[styles.glowB, { transform: [{ scale: 1 - i * 0.25 }], opacity: 0.05 + i * 0.025 }]} />)}

    <View style={styles.header} pointerEvents="box-none">
      <Text style={styles.title}>Bubble release</Text>
      <Text style={styles.count} accessibilityLiveRegion="polite">{released} released</Text>
    </View>

    <View style={styles.area} onLayout={onLayout}>
      {/* Breathing circle */}
      <View style={styles.breathCenter} pointerEvents="none">
        <Animated.View style={[styles.breathHalo, { opacity: breathGlow, transform: [{ scale: breathScale }] }]} />
        <Animated.View style={[styles.breathCore, { transform: [{ scale: breathScale }] }]}>
          <Text style={styles.breathText}>{phase === 'in' ? 'Breathe in' : 'Breathe out'}</Text>
        </Animated.View>
      </View>

      {area.height > 0 && bubbles.map((b) => <Bubble key={b.id} spec={b} height={area.height} calm={calm} onGone={onGone} onPop={onPop} />)}

      <Animated.View style={[styles.hint, { opacity: hint }]} pointerEvents="none">
        <Text style={styles.hintText}>Tap the bubbles to let them go.{'\n'}Breathe with the circle if you like.</Text>
      </Animated.View>
    </View>

    <View style={styles.footer}>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <Text style={styles.footerText}>{Math.max(0, Math.ceil((SESSION_SECONDS - elapsed) / 60))} min · no score, no rush</Text>
    </View>

    {finished ? <View style={styles.overlay}>
      <View style={styles.card}>
        <Icon name="sparkles-outline" size={28} color="#6ee7b7" />
        <Text style={styles.cardTitle}>Nice reset</Text>
        <Text style={styles.cardText}>{released > 0 ? `You let go of ${released} bubble${released === 1 ? '' : 's'} in three minutes.` : 'You gave yourself three calm minutes.'} Take one slow breath before you move on.</Text>
        <View style={styles.cardButtons}>
          <TouchableOpacity style={styles.secondary} onPress={keepGoing} accessibilityRole="button"><Text style={styles.secondaryText}>Keep going</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.goBack()} accessibilityRole="button"><Text style={styles.primaryText}>Done</Text></TouchableOpacity>
        </View>
      </View>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1324', overflow: 'hidden' },
  glowA: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#0f766e', top: -140, left: -160 },
  glowB: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: '#6d28d9', bottom: -120, right: -150 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, zIndex: 2 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  count: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  area: { flex: 1 },
  breathCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  breathHalo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#14b8a6' },
  breathCore: { width: 190, height: 190, borderRadius: 95, borderWidth: 1.5, borderColor: '#5eead455', backgroundColor: '#0f766e33', alignItems: 'center', justifyContent: 'center' },
  breathText: { color: '#ccfbf1', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  bubbleWrap: { position: 'absolute', top: 0 },
  ring: { position: 'absolute', borderWidth: 2 },
  bubble: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  shine: { position: 'absolute', backgroundColor: '#ffffff', opacity: 0.55, transform: [{ rotate: '-30deg' }] },
  shineSmall: { position: 'absolute', backgroundColor: '#ffffff', opacity: 0.45 },
  hint: { position: 'absolute', left: 0, right: 0, top: 24, alignItems: 'center' },
  hintText: { color: '#cbd5e1', textAlign: 'center', lineHeight: 21, backgroundColor: '#0b1324cc', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: 'hidden' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: '#1e293b', overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#5eead4' },
  footerText: { color: '#64748b', fontSize: 12, marginTop: 8, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b1324d9', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 5 },
  card: { backgroundColor: '#1e293b', borderRadius: 22, padding: 24, alignItems: 'center', width: '100%', maxWidth: 380 },
  cardTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginTop: 10 },
  cardText: { color: '#94a3b8', textAlign: 'center', lineHeight: 21, marginTop: 8 },
  cardButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secondary: { borderWidth: 1, borderColor: '#334155', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12 },
  secondaryText: { color: '#e2e8f0', fontWeight: '700' },
  primary: { backgroundColor: '#10b981', borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
  primaryText: { color: '#022c22', fontWeight: '800' },
});
