import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, isCoachConfigured } from './coach';

export type Account = { id: string; email: string; name: string | null; createdAt: string };

const TOKEN_KEY = 'account_token';
const ACCOUNT_KEY = 'account_profile';

// The session token goes in the iOS Keychain; the browser preview falls back to local storage.
const tokenStore = {
  get: () => (Platform.OS === 'web' ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY)),
  set: (v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(TOKEN_KEY, v) : SecureStore.setItemAsync(TOKEN_KEY, v)),
  clear: () => (Platform.OS === 'web' ? AsyncStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY)),
};

export const accountsAvailable = isCoachConfigured;

export class AccountError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export const ACCOUNT_ERROR_TEXT: Record<string, string> = {
  invalid_email: 'Please enter a valid email address.',
  weak_password: 'Use a password with at least 8 characters.',
  email_taken: 'An account with this email already exists. Try signing in instead.',
  wrong_credentials: 'That email and password do not match.',
  too_many_attempts: 'Too many attempts. Please wait a while and try again.',
  offline: 'Could not connect. Check your internet connection and try again.',
  accounts_unavailable: 'Accounts are not available right now.',
};

async function request<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AccountError('offline');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AccountError(data.error ?? 'server_error');
  return data as T;
}

async function saveSession(result: { user: Account; token: string }): Promise<Account> {
  await tokenStore.set(result.token);
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(result.user));
  return result.user;
}

export const signUp = async (email: string, password: string, name: string) =>
  saveSession(await request('POST', '/auth/signup', { email, password, name }));

export const signIn = async (email: string, password: string) =>
  saveSession(await request('POST', '/auth/login', { email, password }));

export async function signOut(): Promise<void> {
  await tokenStore.clear();
  await AsyncStorage.removeItem(ACCOUNT_KEY);
}

/** Cached account for instant start-up, refreshed from the server when online. */
export async function loadAccount(): Promise<Account | null> {
  const cached = await AsyncStorage.getItem(ACCOUNT_KEY);
  const token = await tokenStore.get();
  if (!token) return null;
  try {
    const { user } = await request<{ user: Account }>('GET', '/auth/me', undefined, token);
    await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(user));
    return user;
  } catch (e) {
    if ((e as AccountError).code === 'signed_out') {
      await signOut();
      return null;
    }
    return cached ? JSON.parse(cached) : null; // offline: keep the cached account
  }
}

export async function deleteAccount(): Promise<void> {
  const token = await tokenStore.get();
  if (token) await request('DELETE', '/auth/account', undefined, token);
  await signOut();
}
