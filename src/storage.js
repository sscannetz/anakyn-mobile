// ══════════════════════════════════════════════════════
// storage.js — AsyncStorage wrapper แทน sessionStorage
// ══════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'anakyn_token';
const ROLE_KEY  = 'anakyn_role';

export async function saveSession(token, role) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(ROLE_KEY, role);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRole() {
  return AsyncStorage.getItem(ROLE_KEY);
}

export async function clearSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(ROLE_KEY);
}
