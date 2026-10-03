import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';

type State = { error: Error | null };

/** Shows a recoverable error screen instead of a blank page if any screen crashes. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>Your data is safe on this device. Tap below to go back to the app.</Text>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}><Text style={styles.buttonText}>Try again</Text></TouchableOpacity>
        <Text style={styles.detail} selectable>{String(this.state.error?.message ?? this.state.error)}</Text>
      </ScrollView>
    </View>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  body: { color: '#94a3b8', lineHeight: 21, marginTop: 8 },
  button: { backgroundColor: '#10b981', borderRadius: 24, paddingVertical: 13, alignItems: 'center', marginTop: 22 },
  buttonText: { color: '#022c22', fontWeight: '800' },
  detail: { color: '#64748b', fontSize: 12, marginTop: 24 },
});
