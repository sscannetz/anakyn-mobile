// ══════════════════════════════════════════════════════
// LoginScreen.jsx — หน้าเข้าสู่ระบบ
//
//   จอกว้าง (>= 1024) → แบ่งสองฝั่ง: โลโก้ซ้าย ฟอร์มขวา
//   จอแคบ / มือถือ    → โลโก้ด้านบน ฟอร์มเป็นแผ่นครีมด้านล่าง
//
// ปุ่มเลือก แอดมิน/พนักงาน ถอดออกแล้ว — สิทธิ์มาจากบัญชีที่ล็อกอิน
// ปุ่มเข้าสู่ระบบด้วย LINE ถอดออกแล้ว — ยังไม่ได้ต่อระบบจริง
// ══════════════════════════════════════════════════════
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { saveSession } from '../storage';
import { LOGO_LIGHT_URI } from '../logoBase64';

const WIDE = 1024;

const T = {
  th: {
    tagline: 'Jewelry Management System',
    heading: 'เข้าสู่ระบบ',
    sub: 'ระบบจัดการร้าน — ขาย สต๊อก และเอกสาร',
    emailLabel: 'อีเมล / ชื่อผู้ใช้', emailPh: 'example@anakyngems.com',
    passLabel: 'รหัสผ่าน', passPh: '••••••••',
    loginBtn: 'เข้าสู่ระบบ', loggingIn: 'กำลังเข้าสู่ระบบ...',
    version: 'Anakyn Gems v1.0.0 · © 2026',
    help: 'มีปัญหาเข้าใช้งาน ติดต่อผู้ดูแลระบบของร้าน',
    errorGeneric: 'เข้าสู่ระบบไม่สำเร็จ',
    errorEmpty: 'กรุณากรอกอีเมลและรหัสผ่าน',
  },
  en: {
    tagline: 'Jewelry Management System',
    heading: 'Log in',
    sub: 'Shop management — sales, stock and documents',
    emailLabel: 'Email / Username', emailPh: 'example@anakyngems.com',
    passLabel: 'Password', passPh: '••••••••',
    loginBtn: 'Log in', loggingIn: 'Logging in...',
    version: 'Anakyn Gems v1.0.0 · © 2026',
    help: 'Having trouble? Contact the shop administrator',
    errorGeneric: 'Login failed',
    errorEmpty: 'Please enter email and password',
  },
};

export default function LoginScreen({ navigation }) {
  const { styles, sc } = useScaledStyles(baseStyles);
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= WIDE;

  const [lang, setLang]         = useState('th');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const t = T[lang];

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError(t.errorEmpty); return; }
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

  const LangBtn = (
    <TouchableOpacity
      dataSet={{ hov: 'btn' }}
      onPress={() => setLang(l => (l === 'th' ? 'en' : 'th'))}
      style={wide ? styles.langWide : styles.langBtnAbs}
    >
      <MaterialCommunityIcons name="translate" size={sc(13)} color={wide ? '#550a19' : '#f5e0e5'} />
      <Text style={[styles.langBtnText, wide && { color: '#550a19' }]}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
    </TouchableOpacity>
  );

  const Brand = (
    <View style={wide ? styles.brandWide : styles.hero}>
      {!wide && LangBtn}
      <Image source={{ uri: LOGO_LIGHT_URI }} style={wide ? styles.logoWide : styles.logo} resizeMode="contain" />
      <View style={styles.rule} />
      <Text style={styles.heroTagline}>{t.tagline}</Text>
      {wide && <Text style={styles.brandFoot}>ANAKYN GEMS · V1.0.0 · © 2026</Text>}
    </View>
  );

  const Form = (
    <View style={styles.formInner}>
      <Text style={styles.heading}>{t.heading}</Text>
      <Text style={styles.subHeading}>{t.sub}</Text>

      {!!error && (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      )}

      <Text style={styles.fieldLabel}>{t.emailLabel}</Text>
      <TextInput
        dataSet={{ hov: 'field' }}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={t.emailPh}
        placeholderTextColor="#c0a0a8"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.fieldLabel}>{t.passLabel}</Text>
      <View style={styles.pwRow}>
        <TextInput
          dataSet={{ hov: 'field' }}
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={password}
          onChangeText={setPassword}
          placeholder={t.passPh}
          placeholderTextColor="#c0a0a8"
          secureTextEntry={!showPw}
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
          <MaterialCommunityIcons name={showPw ? 'eye' : 'eye-off'} size={sc(18)} color="#c0a0a8" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        dataSet={{ hov: 'btn' }}
        onPress={handleLogin}
        disabled={loading}
        style={[styles.loginBtn, { opacity: loading ? 0.7 : 1 }]}
      >
        {loading
          ? <ActivityIndicator color="#fff5f7" size="small" />
          : <MaterialCommunityIcons name="login" size={sc(18)} color="#fff5f7" />}
        <Text style={styles.loginBtnText}>{loading ? t.loggingIn : t.loginBtn}</Text>
      </TouchableOpacity>

      <Text style={styles.help}>{t.help}</Text>
      {!wide && <Text style={styles.version}>{t.version}</Text>}
    </View>
  );

  // ── จอกว้าง: สองฝั่ง ──
  if (wide) {
    return (
      <View style={styles.wideWrap}>
        {Brand}
        <View style={styles.wideForm}>
          {LangBtn}
          {Form}
        </View>
      </View>
    );
  }

  // ── จอแคบ / มือถือ ──
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {Brand}
          <View style={styles.form}>{Form}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = {
  safe: { flex: 1, backgroundColor: '#550a19' },
  scroll: { flexGrow: 1 },

  // ── จอแคบ ──
  hero: {
    backgroundColor: '#550a19',
    paddingTop: 44,
    paddingBottom: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: { width: 148, height: 44 },
  rule: { width: 54, height: 1, backgroundColor: 'rgba(232,199,207,0.7)', marginTop: 18, marginBottom: 12 },
  heroTagline: { fontSize: 12, color: '#d9aebb' },
  langBtnAbs: {
    position: 'absolute',
    top: 14, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  langBtnText: { fontSize: 12, fontWeight: '500', color: '#f5e0e5' },
  form: {
    flex: 1,
    backgroundColor: '#f9f4f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    marginTop: -18,
  },

  // ── จอกว้าง ──
  wideWrap: { flex: 1, flexDirection: 'row', backgroundColor: '#f9f4f5', minHeight: '100%' },
  brandWide: {
    width: '46%',
    backgroundColor: '#550a19',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 54,
  },
  logoWide: { width: 210, height: 62 },
  brandFoot: {
    position: 'absolute',
    left: 40, bottom: 30,
    fontSize: 10, letterSpacing: 1,
    color: 'rgba(255,245,247,0.5)',
  },
  wideForm: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  langWide: {
    position: 'absolute',
    top: 22, right: 26,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e8d5d9',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },

  // ── ฟอร์ม (ใช้ร่วมกัน) ──
  formInner: { width: '100%', maxWidth: 380 },
  heading: { fontSize: 21, fontWeight: '600', color: '#2c1015' },
  subHeading: { fontSize: 12.5, color: '#a07080', marginTop: 3, marginBottom: 18 },
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
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  eyeBtn: { padding: 8 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
    backgroundColor: '#550a19',
  },
  loginBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  help: { textAlign: 'center', fontSize: 11, color: '#b09090', marginTop: 16 },
  version: { textAlign: 'center', fontSize: 10, color: '#c0a0a8', marginTop: 10 },
};
