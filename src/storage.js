// ══════════════════════════════════════════════════════
// storage.js — AsyncStorage wrapper แทน sessionStorage
// ══════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'anakyn_token';
const THEME_KEY = 'anakyn_theme';
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

// ธีมที่ผู้ใช้เลือกเอง — ไม่มีค่า = ตามเครื่อง
// ★ ไม่ล้างตอน logout เพราะเป็นค่าของเครื่อง ไม่ใช่ของบัญชี
export async function getThemePref() {
  try { return await AsyncStorage.getItem(THEME_KEY); } catch (_) { return null; }
}
export async function saveThemePref(pref) {
  try { await AsyncStorage.setItem(THEME_KEY, pref); } catch (_) {}
}

export async function clearSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(ROLE_KEY);
}
