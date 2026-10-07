import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { EMPTY_DRAFT, JOURNAL_DRAFT_KEY, JOURNAL_DRAFT_UNREADABLE_KEY, JOURNAL_FIELD_MAX, draftAfterSave, entryId, entryTitle, loadJournal, newEntryId, saveJournal, type JournalDraft, type JournalEntry } from '../lib/journal';

const PROMPTS = [
  'What happened, without judging it?',
  'What feeling needs some space today?',
  'What would make today one percent easier?',
  'What is one thing you handled well?',
];
const FEELINGS = ['Calm', 'Hopeful', 'Stressed', 'Low', 'Anxious', 'Frustrated'];
const PAGE = 20;

export default function JournalScreen() {
  const params = (useRoute<any>().params ?? {}) as { prefill?: string; openId?: string };
  const [draft, setDraft] = useState<JournalDraft>(EMPTY_DRAFT);
  const draftRef = useRef(draft);
  draftRef.current = draft; // always the latest text, including anything typed during a save
  // Draft state: writes are only allowed once the stored draft has been read (or safely set aside).
  const [draftLoad, setDraftLoad] = useState<'loading' | 'ok' | 'error'>('loading');
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const draftReady = draftLoad === 'ok';
  const [promptIndex, setPromptIndex] = useState(0);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'savedNewerKept' | 'error'>('idle');
  const [showAll, setShowAll] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<JournalEntry | null>(null);
  const pendingOpen = useRef(params.openId);

  // ---- Load reflections. Saving stays disabled until this succeeds, so a failed read can't overwrite them.
  const loadEntries = useCallback(async () => {
    setLoad('loading');
    const result = await loadJournal();
    if (!result.ok) { setLoad('error'); return; }
    setEntries(result.entries);
    setLoad('ready');
    if (pendingOpen.current) {
      const found = result.entries.find((e) => entryId(e) === pendingOpen.current);
      if (found) setOpen(found);
      pendingOpen.current = undefined;
    }
  }, []);
  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { if (params.openId && load === 'ready') { const f = entries.find((e) => entryId(e) === params.openId); if (f) setOpen(f); } }, [params.openId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Unfinished writing is autosaved, so leaving the screen never loses it.
  // If the stored draft can't be read, nothing is written (that would delete it); the form stays locked with Retry.
  const loadDraft = useCallback(async () => {
    setDraftLoad('loading');
    let raw: string | null;
    try { raw = await AsyncStorage.getItem(JOURNAL_DRAFT_KEY); } catch { setDraftLoad('error'); return; }
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setDraft({ ...EMPTY_DRAFT, ...d, feelings: Array.isArray(d.feelings) ? d.feelings : [] });
      } catch {
        // Unreadable draft: keep a copy before anything replaces it. If that fails, don't continue.
        try { await AsyncStorage.setItem(JOURNAL_DRAFT_UNREADABLE_KEY, raw); } catch { setDraftLoad('error'); return; }
      }
    }
    setDraftLoad('ok');
  }, []);
  useEffect(() => { loadDraft(); }, [loadDraft]);
  // Arriving from Anxiety support: start with the worry the user already wrote (never over existing text).
  useEffect(() => { if (draftReady && params.prefill) setDraft((d) => (d.situation.trim() ? d : { ...d, situation: params.prefill! })); }, [draftReady, params.prefill]);
  useEffect(() => {
    if (!draftReady) return;
    const empty = !draft.situation && !draft.thought && !draft.perspective && !draft.nextStep && !draft.feelings.length;
    (empty ? AsyncStorage.removeItem(JOURNAL_DRAFT_KEY) : AsyncStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify(draft)))
      .then(() => setDraftSaveFailed(false), () => setDraftSaveFailed(true)); // the draft note shows the real result
  }, [draft, draftReady]);

  const update = (patch: Partial<JournalDraft>) => { setDraft((d) => ({ ...d, ...patch })); if (save !== 'saving' && save !== 'idle') setSave('idle'); };
  const toggleFeeling = (feeling: string) => update({ feelings: draft.feelings.includes(feeling) ? draft.feelings.filter((f) => f !== feeling) : [...draft.feelings, feeling] });
  const hasText = !!(draft.situation.trim() || draft.thought.trim() || draft.perspective.trim() || draft.nextStep.trim() || draft.feelings.length);

  const clearForm = () => {
    if (!hasText) return;
    Alert.alert('Clear this reflection?', 'What you have written so far will be deleted.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setDraft(EMPTY_DRAFT); setSave('idle'); } },
    ]);
  };

  const saveEntry = async () => {
    if (load !== 'ready' || !draftReady || save === 'saving') return;
    if (!draft.situation.trim() && !draft.thought.trim()) {
      Alert.alert('Start with one thought', 'Write what happened or what is on your mind.');
      return;
    }
    const entry: JournalEntry = {
      id: newEntryId(),
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      situation: draft.situation.trim(),
      feelings: draft.feelings,
      thought: draft.thought.trim(),
      perspective: draft.perspective.trim(),
      nextStep: draft.nextStep.trim(),
    };
    setSave('saving');
    const saved = draft; // exactly what this save contains
    const updated = [entry, ...entries]; // every reflection is kept: no silent removal of older ones
    try {
      await saveJournal(updated);
      setEntries(updated);
      // Only clear the form if nothing was typed while saving; newer text is kept as the draft.
      const after = draftAfterSave(draftRef.current, saved);
      setDraft(after.draft);
      setSave(after.newerKept ? 'savedNewerKept' : 'saved');
    } catch {
      setSave('error'); // the draft is kept, so Retry saves exactly this reflection
    }
  };

  const remove = (target: JournalEntry) => {
    Alert.alert('Delete this reflection?', 'It will be permanently removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const id = entryId(target);
        const index = entries.findIndex((e) => entryId(e) === id);
        if (index < 0) return;
        const next = entries.filter((_, i) => i !== index);
        try { await saveJournal(next); setEntries(next); setOpen(null); }
        catch { Alert.alert('Not deleted', 'The reflection could not be deleted. Please try again.'); }
      } },
    ]);
  };

  const listed = showAll ? entries.slice(0, visible) : entries.slice(0, 5);

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="book-outline" size={30} color="#c4b5fd" /><Text style={styles.title}>Reflect with clarity</Text><Text style={styles.subtitle}>Name what is happening, create space around it, and choose one gentle next step.</Text></View>
    <View style={styles.promptCard}><View style={styles.promptTop}><Text style={styles.promptLabel}>GUIDED REFLECTION</Text><TouchableOpacity onPress={() => setPromptIndex((promptIndex + 1) % PROMPTS.length)} accessibilityLabel="Another prompt"><Icon name="refresh-outline" size={19} color="#c4b5fd" /></TouchableOpacity></View><Text style={styles.prompt}>{PROMPTS[promptIndex]}</Text></View>
    <Text style={styles.sectionTitle}>1. What happened?</Text><TextInput style={styles.shortInput} value={draft.situation} onChangeText={(v) => update({ situation: v })} editable={draftReady} maxLength={JOURNAL_FIELD_MAX} placeholder="Describe the situation or moment" placeholderTextColor="#64748b" multiline />
    <Text style={styles.sectionTitle}>2. What are you feeling?</Text><View style={styles.feelings}>{FEELINGS.map((feeling) => <TouchableOpacity key={feeling} onPress={() => toggleFeeling(feeling)} style={[styles.feelingChip, draft.feelings.includes(feeling) && styles.feelingChipSelected]}><Text style={[styles.feelingText, draft.feelings.includes(feeling) && styles.feelingTextSelected]}>{feeling}</Text></TouchableOpacity>)}</View>
    <Text style={styles.sectionTitle}>3. What is your mind saying?</Text><TextInput style={styles.shortInput} value={draft.thought} onChangeText={(v) => update({ thought: v })} editable={draftReady} maxLength={JOURNAL_FIELD_MAX} placeholder="For example: 'I am going to mess this up'" placeholderTextColor="#64748b" multiline />
    <View style={styles.reframeCard}><View style={styles.reframeHeading}><Icon name="heart-outline" size={20} color="#f0abfc" /><Text style={styles.reframeTitle}>A more balanced perspective</Text></View><Text style={styles.helper}>What would you say to a friend in this exact situation?</Text><TextInput style={styles.reframeInput} value={draft.perspective} onChangeText={(v) => update({ perspective: v })} editable={draftReady} maxLength={JOURNAL_FIELD_MAX} placeholder="Write a fairer, kinder response" placeholderTextColor="#a78bfa" multiline /></View>
    <Text style={styles.sectionTitle}>4. One small next step</Text><TextInput style={styles.shortInput} value={draft.nextStep} onChangeText={(v) => update({ nextStep: v })} editable={draftReady} maxLength={JOURNAL_FIELD_MAX} placeholder="Something realistic you can do next" placeholderTextColor="#64748b" />
    {draftLoad === 'error' ? <View style={styles.errorBox}><Icon name="alert-circle-outline" size={20} color="#fca5a5" /><Text style={styles.errorText}>Couldn't open your saved draft. Nothing has been changed.</Text><TouchableOpacity onPress={loadDraft}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View>
      : hasText && save !== 'saved' ? (draftSaveFailed
        ? <Text style={[styles.draftNote, styles.draftWarn]}>Couldn't keep this draft on your phone. Save it before leaving.</Text>
        : <Text style={styles.draftNote}>Draft kept on this phone until you save or clear it.</Text>) : null}
    <View style={styles.actions}>
      <TouchableOpacity style={styles.clearButton} onPress={clearForm} disabled={!hasText || !draftReady}><Text style={[styles.clearText, !hasText && styles.dim]}>Clear</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.saveButton, (load !== 'ready' || !draftReady || save === 'saving') && styles.saveDisabled]} onPress={saveEntry} disabled={load !== 'ready' || !draftReady || save === 'saving'} accessibilityRole="button">
        {save === 'saving' ? <ActivityIndicator color="#fff" /> : <Icon name="save-outline" size={19} color="#fff" />}
        <Text style={styles.saveText}>{save === 'saving' ? 'Saving…' : 'Save reflection'}</Text>
      </TouchableOpacity>
    </View>
    {save === 'saved' || save === 'savedNewerKept' ? <View style={styles.saved}><Icon name="checkmark-circle-outline" size={20} color="#a7f3d0" /><Text style={styles.savedText}>{save === 'saved' ? 'Reflection saved privately on this device.' : 'Saved. Your newer changes are still in the draft.'}</Text></View> : null}
    {save === 'error' ? <View style={styles.errorBox}><Icon name="alert-circle-outline" size={20} color="#fca5a5" /><Text style={styles.errorText}>Couldn't save. Your writing is still here.</Text><TouchableOpacity onPress={saveEntry}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}

    <Text style={styles.recent}>Your reflections{entries.length ? ` (${entries.length})` : ''}</Text>
    {load === 'loading' ? <ActivityIndicator color="#c4b5fd" style={{ marginVertical: 20 }} />
      : load === 'error' ? <View style={styles.errorBox}><Icon name="alert-circle-outline" size={20} color="#fca5a5" /><Text style={styles.errorText}>Couldn't open your saved reflections. Nothing has been changed.</Text><TouchableOpacity onPress={loadEntries}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View>
      : entries.length === 0 ? <Text style={styles.empty}>Your reflections will appear here.</Text>
      : <>
        {listed.map((entry) => <TouchableOpacity key={entryId(entry)} style={styles.entry} onPress={() => setOpen(entry)} accessibilityRole="button" accessibilityHint="Opens the full reflection">
          <View style={styles.entryTop}><Text style={styles.entryDate}>{entry.date}</Text>{entry.feelings?.length ? <Text style={styles.entryFeelings}>{entry.feelings.join(' · ')}</Text> : null}</View>
          <Text style={styles.entryText} numberOfLines={3}>{entryTitle(entry)}</Text>
          {entry.nextStep ? <Text style={styles.entryStep}>Next: {entry.nextStep}</Text> : null}
          <Text style={styles.openLink}>Read in full ›</Text>
        </TouchableOpacity>)}
        {!showAll && entries.length > 5 ? <TouchableOpacity onPress={() => setShowAll(true)} style={styles.more}><Text style={styles.moreText}>Show all {entries.length} reflections</Text></TouchableOpacity> : null}
        {showAll && entries.length > visible ? <TouchableOpacity onPress={() => setVisible(visible + PAGE)} style={styles.more}><Text style={styles.moreText}>Show more</Text></TouchableOpacity> : null}
      </>}

    <Modal visible={!!open} animationType="slide" transparent onRequestClose={() => setOpen(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}><Text style={styles.modalDate}>{open?.date}</Text><TouchableOpacity onPress={() => setOpen(null)} accessibilityLabel="Close"><Icon name="close" size={24} color="#cbd5e1" /></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {open?.feelings?.length ? <Text style={styles.entryFeelingsFull}>{open.feelings.join(' · ')}</Text> : null}
            {[['What happened', open?.situation || open?.text], ['What my mind was saying', open?.thought], ['A more balanced perspective', open?.perspective], ['My next step', open?.nextStep]]
              .filter(([, v]) => !!(v && String(v).trim()))
              .map(([label, value]) => <View key={label as string} style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue} selectable>{value}</Text></View>)}
          </ScrollView>
          <TouchableOpacity style={styles.deleteButton} onPress={() => open && remove(open)} accessibilityRole="button"><Icon name="trash-outline" size={18} color="#fca5a5" /><Text style={styles.deleteText}>Delete reflection</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  promptCard: { backgroundColor: '#312e4d', borderRadius: 17, padding: 18 }, promptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, promptLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, prompt: { color: '#f8fafc', fontSize: 17, lineHeight: 24, marginTop: 11 }, sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 23, marginBottom: 9 },
  shortInput: { minHeight: 68, backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, borderRadius: 14, padding: 14, color: '#f8fafc', lineHeight: 20, textAlignVertical: 'top' }, feelings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, feelingChip: { borderColor: '#475569', borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, feelingChipSelected: { backgroundColor: '#6d28d9', borderColor: '#8b5cf6' }, feelingText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' }, feelingTextSelected: { color: '#fff' },
  reframeCard: { backgroundColor: '#4a1d45', borderRadius: 16, padding: 16, marginTop: 22 }, reframeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, reframeTitle: { color: '#fce7f3', fontSize: 16, fontWeight: '700' }, helper: { color: '#f0abfc', fontSize: 12, lineHeight: 18, marginTop: 8 }, reframeInput: { minHeight: 70, backgroundColor: 'rgba(76,29,72,0.7)', borderColor: '#86198f', borderWidth: 1, borderRadius: 12, padding: 12, color: '#fce7f3', marginTop: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 }, clearButton: { width: 86, borderColor: '#475569', borderWidth: 1, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }, clearText: { color: '#cbd5e1', fontWeight: '700' }, saveButton: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8b5cf6', borderRadius: 25, paddingVertical: 15 }, saveText: { color: '#fff', fontSize: 16, fontWeight: '700' }, saved: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#12372f', borderRadius: 12, padding: 13, marginTop: 14 }, savedText: { color: '#a7f3d0', fontSize: 13, fontWeight: '600' },
  recent: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 29, marginBottom: 12 }, empty: { color: '#64748b', textAlign: 'center', marginVertical: 20 }, entry: { backgroundColor: '#1e293b', padding: 16, borderRadius: 14, marginBottom: 10 }, entryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, entryDate: { color: '#94a3b8', fontSize: 11 }, entryFeelings: { color: '#c4b5fd', fontSize: 11, flex: 1, textAlign: 'right' }, entryText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginTop: 8 }, entryStep: { color: '#a7f3d0', fontSize: 12, marginTop: 10 },
  draftNote: { color: '#64748b', fontSize: 12, marginTop: 14 }, draftWarn: { color: '#fca5a5' }, dim: { opacity: 0.4 }, saveDisabled: { opacity: 0.5 },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#3f1d1d', borderRadius: 12, padding: 13, marginTop: 14 }, errorText: { color: '#fecaca', fontSize: 13, flex: 1 }, retry: { color: '#93c5fd', fontWeight: '800' },
  openLink: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', marginTop: 10 }, more: { alignItems: 'center', padding: 12 }, moreText: { color: '#c4b5fd', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.75)', justifyContent: 'flex-end' }, modalCard: { backgroundColor: '#1e293b', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%', width: '100%', maxWidth: 720, alignSelf: 'center' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, modalDate: { color: '#94a3b8', fontSize: 13, fontWeight: '700' }, entryFeelingsFull: { color: '#c4b5fd', fontSize: 13, marginBottom: 6 },
  field: { marginTop: 14 }, fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }, fieldValue: { color: '#f1f5f9', fontSize: 15, lineHeight: 22, marginTop: 6 },
  deleteButton: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#7f1d1d', borderRadius: 22, paddingVertical: 12, marginTop: 12 }, deleteText: { color: '#fca5a5', fontWeight: '700' },
});
