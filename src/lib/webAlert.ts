import { Alert, Platform, type AlertButton } from 'react-native';

// react-native-web ships Alert.alert as a no-op, so on the web every message and confirmation
// (Clear All Data, Remove contact, "Saved") silently did nothing. Map it to the browser's dialogs.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = message ? `${title}\n\n${message}` : title;
    const cancel = buttons?.find((b) => b.style === 'cancel');
    const choices = (buttons ?? []).filter((b) => b !== cancel);
    if (choices.length <= 1 && !cancel) {
      window.alert(text);
      choices[0]?.onPress?.();
      return;
    }
    if (choices.length <= 1) {
      if (window.confirm(text)) choices[0]?.onPress?.();
      else cancel?.onPress?.();
      return;
    }
    // Several actions (e.g. a contact's Call / Message / Remove): offer each in turn.
    for (const choice of choices) {
      if (window.confirm(`${text}\n\n${choice.text}?`)) { choice.onPress?.(); return; }
    }
    cancel?.onPress?.();
  };
}
