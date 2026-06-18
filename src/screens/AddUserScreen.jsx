// ══════════════════════════════════════════════════════
// AddUserScreen.jsx — React Native (Admin only)
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { api } from '../api';
import { getRole } from '../storage';

const T = {
  th: {
    pageTitle: 'จัดการผู้ใช้', addUser: 'เพิ่มผู้ใช้ใหม่',
    name: 'ชื่อ-นามสกุล', email: 'อีเมล', password: 'รหัสผ่าน',
    confirmPw: 'ยืนยันรหัสผ่าน', role: 'บทบาท',
    saveBtn: 'บันทึก', saving: 'กำลังบันทึก...',
    adminOnly: 'เฉพาะ Admin เท่านั้น', noUsers: 'ยังไม่มีผู้ใช้',
    pwMismatch: 'รหัสผ่านไม่ตรงกัน', fillAll: 'กรุณากรอกข้อมูลให้ครบ',
    deleteConfirm: 'ต้องการลบผู้ใช้นี้?', confirmYes: 'ลบ', confirmNo: 'ยกเลิก',
    roles: { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน' },
    statusActive: 'ใช้งาน', statusInactive: 'ระงับ',
  },
  en: {
    pageTitle: 'Manage Users', addUser: 'Add new user',
    name: 'Full Name', email: 'Email', password: 'Password',
    confirmPw: 'Confirm Password', role: 'Role',
    saveBtn: 'Save', saving: 'Saving...',
    adminOnly: 'Admin only', noUsers: 'No users yet',
    pwMismatch: 'Passwords do not match', fillAll: 'Please fill all fields',
    deleteConfirm: 'Delete this user?', confirmYes: 'Delete', confirmNo: 'Cancel',
    roles: { admin: 'Administrator', staff: 'Staff' },
    statusActive: 'Active', statusInactive: 'Inactive',
  },
};

export default function AddUserScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang]     = useState('th');
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [role, setRole]     = useState('staff');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [delTarget, setDelTarget] = useState(null);
  const t = T[lang];

  useEffect(() => {
    getRole().then(r => setIsAdmin(r === 'admin'));
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setConfirmPw('');
    setRole('staff'); setError('');
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError(t.fillAll); return;
    }
    if (password !== confirmPw) {
      setError(t.pwMismatch); return;
    }
    setSaving(true); setError('');
    try {
      const u = await api.createUser({ name, email, password, role });
      setUsers(prev => [u, ...prev]);
      setShowNew(false); reset();
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await api.deleteUser(delTarget.id);
      setUsers(prev => prev.filter(u => u.id !== delTarget.id));
    } catch (_) {}
    setDelTarget(null);
  };

  if (!isAdmin && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
        <Header title={t.pageTitle} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
        <View style={s.center}>
          <MaterialCommunityIcons name="lock" size={40} color="#d4a0ac" />
          <Text style={s.adminOnlyText}>{t.adminOnly}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={t.pageTitle} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')}
        rightComponent={
          <TouchableOpacity onPress={() => { reset(); setShowNew(true); }} style={s.iconBtn}>
            <MaterialCommunityIcons name="plus" size={16} color="#f5e0e5" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={s.content}>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && users.length === 0 && <Text style={s.emptyText}>{t.noUsers}</Text>}
        {users.map(u => (
          <View key={u.id} style={s.card}>
            <View style={[s.avatar, { backgroundColor: u.role === 'admin' ? '#fdf0f2' : '#e0f0ff' }]}>
              <Text style={[s.avatarText, { color: u.role === 'admin' ? '#550a19' : '#1a3a60' }]}>
                {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{u.name || '—'}</Text>
              <Text style={s.userEmail}>{u.email}</Text>
              <View style={s.tagRow}>
                <View style={[s.tag, { backgroundColor: u.role === 'admin' ? '#fdf0f2' : '#e0f0ff' }]}>
                  <Text style={[s.tagText, { color: u.role === 'admin' ? '#550a19' : '#1a3a60' }]}>{t.roles[u.role] || u.role}</Text>
                </View>
                <View style={[s.tag, { backgroundColor: u.is_active === false ? '#f5f5f5' : '#e8f5e9' }]}>
                  <Text style={[s.tagText, { color: u.is_active === false ? '#888' : '#1a5c28' }]}>
                    {u.is_active === false ? t.statusInactive : t.statusActive}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setDelTarget(u)} style={s.delBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#c0a0a8" />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ADD USER MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t.addUser}</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}

            <Text style={s.fieldLabel}>{t.name}</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} autoCapitalize="words" placeholderTextColor="#c0a0a8" />

            <Text style={s.fieldLabel}>{t.email}</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#c0a0a8" />

            <Text style={s.fieldLabel}>{t.password}</Text>
            <View style={s.pwRow}>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} autoCapitalize="none" placeholderTextColor="#c0a0a8" />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
                <MaterialCommunityIcons name={showPw ? 'eye-off' : 'eye'} size={18} color="#c0a0a8" />
              </TouchableOpacity>
            </View>

            <Text style={[s.fieldLabel, { marginTop: 10 }]}>{t.confirmPw}</Text>
            <TextInput style={s.input} value={confirmPw} onChangeText={setConfirmPw}
              secureTextEntry={!showPw} autoCapitalize="none" placeholderTextColor="#c0a0a8" />

            <Text style={s.fieldLabel}>{t.role}</Text>
            <View style={s.roleRow}>
              {['staff', 'admin'].map(r => (
                <TouchableOpacity key={r} onPress={() => setRole(r)}
                  style={[s.roleBtn, { backgroundColor: role === r ? '#550a19' : '#f9f4f5', borderColor: role === r ? '#550a19' : '#e8d5d9' }]}>
                  <MaterialCommunityIcons
                    name={r === 'admin' ? 'crown' : 'account'}
                    size={14} color={role === r ? '#f5e0e5' : '#a07080'} />
                  <Text style={[s.roleBtnText, { color: role === r ? '#f5e0e5' : '#a07080' }]}>{t.roles[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.saveBtn, { opacity: saving ? 0.7 : 1, marginTop: 16 }]}>
              {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="account-plus" size={18} color="#fff5f7" />}
              <Text style={s.saveBtnText}>{saving ? t.saving : t.saveBtn}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={!!delTarget} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <MaterialCommunityIcons name="trash-can" size={28} color="#c62828" style={{ marginBottom: 8 }} />
            <Text style={s.confirmMsg}>{t.deleteConfirm}</Text>
            {delTarget && <Text style={s.confirmName}>{delTarget.name || delTarget.email}</Text>}
            <View style={s.confirmBtns}>
              <TouchableOpacity onPress={() => setDelTarget(null)} style={[s.confirmBtn, { backgroundColor: '#f9f4f5' }]}>
                <Text style={[s.confirmBtnText, { color: '#806070' }]}>{t.confirmNo}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[s.confirmBtn, { backgroundColor: '#c62828' }]}>
                <Text style={[s.confirmBtnText, { color: '#fff' }]}>{t.confirmYes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  content:    { padding: 14, paddingBottom: 30 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  adminOnlyText: { fontSize: 14, color: '#a07080', fontWeight: '500' },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '500' },
  userName:   { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  userEmail:  { fontSize: 11, color: '#a07080', marginTop: 1 },
  tagRow:     { flexDirection: 'row', gap: 5, marginTop: 5 },
  tag:        { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tagText:    { fontSize: 9, fontWeight: '500' },
  delBtn:     { padding: 4 },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:     { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, padding: 9, fontSize: 13, color: '#2c1015', marginBottom: 10 },
  pwRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 0 },
  eyeBtn:     { padding: 8, marginLeft: -4 },
  roleRow:    { flexDirection: 'row', gap: 8, marginBottom: 6 },
  roleBtn:    { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  roleBtnText:{ fontSize: 12, fontWeight: '500' },
  saveBtn:    { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  saveBtnText:{ fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 280, alignItems: 'center' },
  confirmMsg: { fontSize: 14, color: '#2c1015', textAlign: 'center', marginBottom: 4 },
  confirmName:{ fontSize: 13, fontWeight: '500', color: '#550a19', textAlign: 'center', marginBottom: 16 },
  confirmBtns:{ flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { fontSize: 13, fontWeight: '500' },
});
