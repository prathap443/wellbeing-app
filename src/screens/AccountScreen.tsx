import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCOUNT_ERROR_TEXT, AccountError, requestPasswordReset } from '../lib/account';
import { useSession } from '../lib/session';

type Props = {
  /** Shown once after onboarding: offers a skip instead of a back button. */
  onDone?: () => void;
};

export default function AccountScreen({ onDone }: Props) {
  // Context (not useNavigation) so this screen also works before the navigator mounts, during onboarding.
  const navigation = React.useContext(NavigationContext) as any;
  const session = useSession();
  const [mode, setMode] = useState<'signup' | 'signin' | 'forgot' | 'reset'>('signup');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const finish = () => (onDone ? onDone() : navigation?.canGoBack() && navigation.goBack());

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    if (mode === 'signup' && password.length < 8) { setError(ACCOUNT_ERROR_TEXT.weak_password); return; }
    setBusy(true);
    try {
      if (mode === 'signup') await session.signUp(email.trim(), password, name.trim());
      else await session.signIn(email.trim(), password);
      setPassword('');
      finish();
    } catch (e) {
      setError(ACCOUNT_ERROR_TEXT[(e as AccountError).code] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const errorText = (e: unknown) => ACCOUNT_ERROR_TEXT[(e as AccountError).code] ?? 'Something went wrong. Please try again.';
  const goTo = (next: typeof mode) => { setMode(next); setError(null); setNotice(null); };

  const sendCode = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter the email you signed up with.'); return; }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setCode(''); setPassword('');
      setMode('reset');
      setNotice(`If there is an account for ${email.trim()}, we have emailed a 6-digit code. It expires in 15 minutes. Check your spam folder if you cannot see it.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.replace(/\s+/g, ''))) { setError('Enter the 6-digit code from the email.'); return; }
    if (password.length < 8) { setError(ACCOUNT_ERROR_TEXT.weak_password); return; }
    setBusy(true);
    try {
      await session.resetPassword(email.trim(), code.replace(/\s+/g, ''), password);
      setPassword(''); setCode('');
      finish();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await session.deleteAccount();
      setConfirmDelete(false);
    } catch (e) {
      setError(ACCOUNT_ERROR_TEXT[(e as AccountError).code] ?? 'Could not delete your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (session.user) {
    const { user } = session;
    return <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(user.name || user.email)[0].toUpperCase()}</Text></View>
      <Text style={[styles.title, styles.centered]}>{user.name || 'Your account'}</Text>
      <Text style={[styles.subtitle, styles.centered]}>{user.email}</Text>

      <View style={styles.card}>
        <View style={styles.row}><Icon name="sparkles-outline" size={20} color="#fcd34d" /><Text style={styles.rowText}>{session.plus ? 'Wellbeing Plus member' : 'Free plan'}</Text>
          {!session.plus ? <TouchableOpacity onPress={() => navigation?.navigate('Subscription')}><Text style={styles.link}>Upgrade</Text></TouchableOpacity> : null}
        </View>
        <View style={styles.row}><Icon name="phone-portrait-outline" size={20} color="#94a3b8" /><Text style={styles.rowText}>Your moods and journal stay on this device.</Text></View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.secondary} onPress={() => session.signOut()} disabled={busy}><Text style={styles.secondaryText}>Sign out</Text></TouchableOpacity>

      {confirmDelete ? <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Delete your account?</Text>
        <Text style={styles.dangerText}>This permanently deletes your account and sign-in details. Data on this device is not affected. If you subscribe to Plus, cancel it separately in your App Store settings.</Text>
        <View style={styles.dangerButtons}>
          <TouchableOpacity style={styles.dangerCancel} onPress={() => setConfirmDelete(false)} disabled={busy}><Text style={styles.secondaryText}>Keep account</Text></TouchableOpacity>
          <TouchableOpacity style={styles.dangerConfirm} onPress={remove} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerConfirmText}>Delete</Text>}</TouchableOpacity>
        </View>
      </View> : <TouchableOpacity style={styles.deleteLink} onPress={() => setConfirmDelete(true)}><Text style={styles.deleteText}>Delete account</Text></TouchableOpacity>}
    </ScrollView>;
  }

  if (mode === 'forgot' || mode === 'reset') {
    return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}><Icon name="key-outline" size={24} color="#bbf7d0" /></View>
        <Text style={styles.title}>{mode === 'forgot' ? 'Reset your password' : 'Enter your code'}</Text>
        <Text style={styles.subtitle}>{mode === 'forgot' ? 'Enter the email you signed up with and we will send you a 6-digit code.' : 'Choose a new password to finish.'}</Text>
        {notice ? <View style={styles.notice}><Icon name="mail-outline" size={18} color="#6ee7b7" /><Text style={styles.noticeText}>{notice}</Text></View> : null}

        {mode === 'forgot' ? <>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#64748b" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" onSubmitEditing={sendCode} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={[styles.primary, busy && styles.primaryDisabled]} onPress={sendCode} disabled={busy} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#022c22" /> : <Text style={styles.primaryText}>Send code</Text>}
          </TouchableOpacity>
        </> : <>
          <TextInput style={[styles.input, styles.codeInput]} value={code} onChangeText={(v) => setCode(v.replace(/[^\d]/g, '').slice(0, 6))} placeholder="6-digit code" placeholderTextColor="#64748b" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="New password (8+ characters)" placeholderTextColor="#64748b" secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submitReset} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={[styles.primary, busy && styles.primaryDisabled]} onPress={submitReset} disabled={busy} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#022c22" /> : <Text style={styles.primaryText}>Set new password</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.switch} onPress={sendCode} disabled={busy}><Text style={styles.switchText}>Didn't get it? <Text style={styles.link}>Send a new code</Text></Text></TouchableOpacity>
        </>}
        <TouchableOpacity style={styles.switch} onPress={() => goTo('signin')}><Text style={styles.link}>Back to sign in</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>;
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.badge}><Icon name="person-outline" size={24} color="#bbf7d0" /></View>
      <Text style={styles.title}>{mode === 'signup' ? 'Create your free account' : 'Welcome back'}</Text>
      <Text style={styles.subtitle}>{mode === 'signup' ? 'Optional. An account keeps Wellbeing Plus on all your devices. Your moods and journal always stay on this phone.' : 'Sign in to restore Wellbeing Plus on this device.'}</Text>

      {mode === 'signup' ? <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="First name (optional)" placeholderTextColor="#64748b" autoComplete="given-name" textContentType="givenName" maxLength={40} /> : null}
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#64748b" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'} placeholderTextColor="#64748b" secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'} onSubmitEditing={submit} />

      {mode === 'signin' ? <TouchableOpacity style={styles.forgot} onPress={() => goTo('forgot')} accessibilityRole="button"><Text style={styles.link}>Forgot password?</Text></TouchableOpacity> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.primary, busy && styles.primaryDisabled]} onPress={submit} disabled={busy} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#022c22" /> : <Text style={styles.primaryText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.switch} onPress={() => goTo(mode === 'signup' ? 'signin' : 'signup')}>
        <Text style={styles.switchText}>{mode === 'signup' ? 'Already have an account? ' : 'New here? '}<Text style={styles.link}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</Text></Text>
      </TouchableOpacity>
      {onDone ? <TouchableOpacity style={styles.skip} onPress={onDone}><Text style={styles.skipText}>Continue without an account</Text></TouchableOpacity> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' }, centered: { textAlign: 'center' },
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 24, paddingBottom: 40, justifyContent: 'center' },
  badge: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#134e4a', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#134e4a', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, avatarText: { color: '#bbf7d0', fontSize: 26, fontWeight: '800' },
  title: { color: '#f8fafc', fontSize: 26, fontWeight: '800', marginTop: 18 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 8, marginBottom: 22 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#334155', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 16, marginBottom: 12 },
  error: { color: '#fca5a5', marginBottom: 10, lineHeight: 19 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 10 },
  codeInput: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: '#064e3b', borderRadius: 12, padding: 12, marginBottom: 16 }, noticeText: { color: '#d1fae5', flex: 1, lineHeight: 19, fontSize: 13 },
  primary: { backgroundColor: '#10b981', borderRadius: 26, paddingVertical: 15, alignItems: 'center', marginTop: 6 }, primaryDisabled: { opacity: 0.6 }, primaryText: { color: '#022c22', fontWeight: '800', fontSize: 16 },
  switch: { alignItems: 'center', padding: 16 }, switchText: { color: '#94a3b8' }, link: { color: '#6ee7b7', fontWeight: '700' },
  skip: { alignItems: 'center', padding: 8 }, skipText: { color: '#64748b', fontWeight: '600' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, gap: 14, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, rowText: { color: '#e2e8f0', flex: 1 },
  secondary: { borderWidth: 1, borderColor: '#334155', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }, secondaryText: { color: '#e2e8f0', fontWeight: '700' },
  deleteLink: { alignItems: 'center', padding: 18 }, deleteText: { color: '#f87171', fontWeight: '600' },
  dangerCard: { backgroundColor: '#3f1d1d', borderRadius: 16, padding: 16, marginTop: 18 }, dangerTitle: { color: '#fecaca', fontWeight: '800', fontSize: 16 }, dangerText: { color: '#fca5a5', lineHeight: 19, marginTop: 6, fontSize: 13 },
  dangerButtons: { flexDirection: 'row', gap: 10, marginTop: 14 }, dangerCancel: { flex: 1, borderWidth: 1, borderColor: '#7f1d1d', borderRadius: 20, paddingVertical: 12, alignItems: 'center' },
  dangerConfirm: { flex: 1, backgroundColor: '#dc2626', borderRadius: 20, paddingVertical: 12, alignItems: 'center' }, dangerConfirmText: { color: '#fff', fontWeight: '800' },
});
