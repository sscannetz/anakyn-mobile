// ══════════════════════════════════════════════════════
// LoginScreen.jsx — React Native version of AnakynLogin
// ══════════════════════════════════════════════════════
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api';
import { saveSession } from '../storage';

const T = {
  th: {
    tagline: 'Jewelry Management System',
    selectRole: 'เข้าสู่ระบบในฐานะ',
    adminLabel: 'แอดมิน / Admin',   adminDesc: 'เข้าถึงได้ทุกส่วน รายงาน และการตั้งค่า',
    staffLabel: 'พนักงาน / Staff',  staffDesc: 'ขายสินค้า สต๊อก และเอกสารทั่วไป',
    emailLabel: 'อีเมล / ชื่อผู้ใช้', emailPh: 'example@anakyngems.com',
    passLabel: 'รหัสผ่าน', passPh: '••••••••',
    remember: 'จดจำการเข้าสู่ระบบ',
    loginBtn: 'เข้าสู่ระบบ', loggingIn: 'กำลังเข้าสู่ระบบ...',
    orText: 'หรือ',
    lineBtn: 'เข้าสู่ระบบด้วย LINE',
    version: 'Anakyn Gems v1.0.0 · © 2026',
    adminBadge: 'สิทธิ์เต็ม — เข้าถึงได้ทุกส่วน',
    staffBadge: 'สิทธิ์พนักงาน — ขาย สต๊อก เอกสาร',
    errorGeneric: 'เข้าสู่ระบบไม่สำเร็จ',
    errorEmpty: 'กรุณากรอกอีเมลและรหัสผ่าน',
  },
  en: {
    tagline: 'Jewelry Management System',
    selectRole: 'Login as',
    adminLabel: 'Admin / Owner',   adminDesc: 'Full access — reports, settings & all modules',
    staffLabel: 'Staff',           staffDesc: 'Sales, stock, and general documents',
    emailLabel: 'Email / Username', emailPh: 'example@anakyngems.com',
    passLabel: 'Password', passPh: '••••••••',
    remember: 'Remember me',
    loginBtn: 'Log in', loggingIn: 'Logging in...',
    orText: 'or',
    lineBtn: 'Log in with LINE',
    version: 'Anakyn Gems v1.0.0 · © 2026',
    adminBadge: 'Full access — all modules',
    staffBadge: 'Staff access — sales, stock, docs',
    errorGeneric: 'Login failed',
    errorEmpty: 'Please enter email and password',
  },
};

const ROLES = [
  { key: 'admin', emoji: '👑', col: '#550a19', bg: '#fdf0f2', border: '#550a19' },
  { key: 'staff', emoji: '👤', col: '#3060a0', bg: '#eef3ff', border: '#3060a0' },
];

export default function LoginScreen({ navigation }) {
  const [lang, setLang]         = useState('th');
  const [role, setRole]         = useState('admin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const t = T[lang];

  const activeRole = ROLES.find(r => r.key === role);
  const badgeText = role === 'admin' ? t.adminBadge : t.staffBadge;
  const badgeBg   = role === 'admin' ? '#fdf0f2' : '#eef3ff';
  const badgeBorder = role === 'admin' ? '#e8c0c8' : '#90b8d8';
  const badgeIcon = role === 'admin' ? 'shield-check' : 'account-check';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t.errorEmpty);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.login(email.trim(), password);
      await saveSession(token, user.role);
      navigation.replace('Home', { userRole: user.role });
    } catch (err) {
      setError(err.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* HERO */}
          <View style={styles.hero}>
            <TouchableOpacity onPress={() => setLang(l => l === 'th' ? 'en' : 'th')} style={styles.langBtnAbs}>
              <MaterialCommunityIcons name="translate" size={13} color="#f5e0e5" />
              <Text style={styles.langBtnText}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
            </TouchableOpacity>
            <Text style={styles.heroTitle}>ANAKYN</Text>
            <Text style={styles.heroSub}>GEMS</Text>
            <Text style={styles.heroTagline}>{t.tagline}</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>

            {/* Role selector */}
            <Text style={styles.sectionLabel}>{t.selectRole}</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => {
                const active = role === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setRole(r.key)}
                    style={[styles.roleCard, { borderColor: active ? r.border : '#e8c0c8', backgroundColor: active ? r.bg : '#fff' }]}
                  >
                    <Text style={styles.roleEmoji}>{r.emoji}</Text>
                    <Text style={[styles.roleLabel, { color: active ? r.col : '#806070' }]}>
                      {t[r.key + 'Label']}
                    </Text>
                    <Text style={styles.roleDesc}>{t[r.key + 'Desc']}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Access badge */}
            <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
              <MaterialCommunityIcons name={badgeIcon} size={15} color={activeRole?.col} />
              <Text style={[styles.badgeText, { color: activeRole?.col }]}>{badgeText}</Text>
            </View>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <Text style={styles.fieldLabel}>{t.emailLabel}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t.emailPh}
              placeholderTextColor="#c0a0a8"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Password */}
            <Text style={styles.fieldLabel}>{t.passLabel}</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder={t.passPh}
                placeholderTextColor="#c0a0a8"
                secureTextEntry={!showPw}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                <MaterialCommunityIcons name={showPw ? 'eye' : 'eye-off'} size={18} color="#c0a0a8" />
              </TouchableOpacity>
            </View>

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.loginBtn, { backgroundColor: activeRole?.col, opacity: loading ? 0.7 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff5f7" size="small" />
              ) : (
                <MaterialCommunityIcons name="login" size={18} color="#fff5f7" />
              )}
              <Text style={styles.loginBtnText}>{loading ? t.loggingIn : t.loginBtn}</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.orText}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* LINE button */}
            <TouchableOpacity style={styles.lineBtn}>
              <MaterialCommunityIcons name="chat-processing" size={18} color="#fff" />
              <Text style={styles.lineBtnText}>{t.lineBtn}</Text>
            </TouchableOpacity>

            <Text style={styles.version}>{t.version}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#550a19' },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: '#550a19',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  langBtnAbs: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langBtnText: { fontSize: 12, fontWeight: '500', color: '#f5e0e5' },
  heroTitle: { fontSize: 28, fontWeight: '600', color: '#fff5f7', letterSpacing: 5 },
  heroSub:   { fontSize: 10, color: '#d4a0ac', letterSpacing: 6, marginTop: 3 },
  heroTagline: { fontSize: 12, color: '#c090a0', marginTop: 8, fontStyle: 'italic' },
  form: {
    flex: 1,
    backgroundColor: '#f9f4f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: '#550a19', textAlign: 'center', marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  roleCard: {
    flex: 1, borderWidth: 1.5, borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4,
  },
  roleEmoji: { fontSize: 22 },
  roleLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  roleDesc:  { fontSize: 9, color: '#a07080', textAlign: 'center', lineHeight: 14 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 0.5, borderRadius: 8, padding: 8, marginBottom: 14,
  },
  badgeText: { fontSize: 11, fontWeight: '500', flex: 1 },
  errorBox: {
    backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8',
    borderRadius: 8, padding: 10, marginBottom: 12,
  },
  errorText: { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e8d5d9',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#2c1015', marginBottom: 12,
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eyeBtn: { padding: 8 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14, marginBottom: 12,
  },
  loginBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#e8c0c8' },
  dividerText: { fontSize: 11, color: '#c0a0a8' },
  lineBtn: {
    backgroundColor: '#00b900', borderRadius: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  lineBtnText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  version: { textAlign: 'center', fontSize: 10, color: '#c0a0a8', marginTop: 16 },
});
