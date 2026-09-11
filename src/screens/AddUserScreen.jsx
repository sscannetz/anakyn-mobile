// ══════════════════════════════════════════════════════
// AddUserScreen.jsx — จัดการผู้ใช้ (Admin only)
//   • เพิ่มผู้ใช้ใหม่
//   • แก้ไขข้อมูลผู้ใช้ (ชื่อ/ชื่อเล่น/เบอร์/อีเมล/บทบาท/สถานะ/รหัสผ่าน)
//   • ลบผู้ใช้
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { getRole } from '../storage';
import {
  useWide, Toolbar, SearchBox, Panel, TableHead, TableRow, TdMain, Pill, Empty, PrimaryButton,
} from '../components/DataPanel';

const T = {
  th: {
    pageTitle: 'จัดการผู้ใช้', addUser: 'เพิ่มผู้ใช้ใหม่', editUser: 'แก้ไขข้อมูลผู้ใช้',
    name: 'ชื่อ-นามสกุล', nickname: 'ชื่อเล่น', phone: 'เบอร์โทร',
    email: 'อีเมล', password: 'รหัสผ่าน', confirmPw: 'ยืนยันรหัสผ่าน', role: 'บทบาท',
    pwHintEdit: 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน',
    pwHintNew: 'อย่างน้อย 8 ตัวอักษร',
    status: 'สถานะการใช้งาน',
    saveBtn: 'บันทึก', saveEditBtn: 'บันทึกการแก้ไข', saving: 'กำลังบันทึก...',
    adminOnly: 'เฉพาะ Admin เท่านั้น', noUsers: 'ยังไม่มีผู้ใช้',
    pwMismatch: 'รหัสผ่านไม่ตรงกัน', fillAll: 'กรุณากรอกข้อมูลให้ครบ',
    pwShort: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    deleteConfirm: 'ต้องการลบผู้ใช้นี้?', confirmYes: 'ลบ', confirmNo: 'ยกเลิก',
    roles: { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน' },
    statusActive: 'ใช้งาน', statusInactive: 'ระงับ',
    optional: '(ไม่บังคับ)',
  },
  en: {
    pageTitle: 'Manage Users', addUser: 'Add new user', editUser: 'Edit user',
    name: 'Full Name', nickname: 'Nickname', phone: 'Phone',
    email: 'Email', password: 'Password', confirmPw: 'Confirm Password', role: 'Role',
    pwHintEdit: 'Leave blank to keep current password',
    pwHintNew: 'At least 8 characters',
    status: 'Account status',
    saveBtn: 'Save', saveEditBtn: 'Save changes', saving: 'Saving...',
    adminOnly: 'Admin only', noUsers: 'No users yet',
    pwMismatch: 'Passwords do not match', fillAll: 'Please fill all fields',
    pwShort: 'Password must be at least 8 characters',
    deleteConfirm: 'Delete this user?', confirmYes: 'Delete', confirmNo: 'Cancel',
    roles: { admin: 'Administrator', staff: 'Staff' },
    statusActive: 'Active', statusInactive: 'Inactive',
    optional: '(optional)',
  },
};

const nameOf = (u) => u?.full_name || u?.name || '';

export default function AddUserScreen({ navigation }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const wide   = useWide(1000);
  const [q, setQ]             = useState('');
  const [lang, setLang]       = useState('th');
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // modal: null = ปิด | { mode:'new' } | { mode:'edit', user }
  const [form, setForm]       = useState(null);
  const [fullName, setFullName]   = useState('');
  const [nickname, setNickname]   = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [role, setRole]           = useState('staff');
  const [isActive, setIsActive]   = useState(true);
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [delTarget, setDelTarget] = useState(null);
  const [delError, setDelError]   = useState('');
  const t = T[lang];
  const isEdit = form?.mode === 'edit';

  useEffect(() => {
    getRole().then(r => setIsAdmin(r === 'admin'));
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setFullName(''); setNickname(''); setPhone(''); setEmail('');
    setPassword(''); setConfirmPw(''); setRole('staff'); setIsActive(true);
    setError(''); setShowPw(false);
    setForm({ mode: 'new' });
  };

  const openEdit = (u) => {
    setFullName(nameOf(u)); setNickname(u.nickname || ''); setPhone(u.phone || '');
    setEmail(u.email || ''); setPassword(''); setConfirmPw('');
    setRole(u.role || 'staff'); setIsActive(u.is_active !== false);
    setError(''); setShowPw(false);
    setForm({ mode: 'edit', user: u });
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim() || (!isEdit && !password.trim())) {
      setError(t.fillAll); return;
    }
    if (password && password.length < 8) { setError(t.pwShort); return; }
    if (password && password !== confirmPw) { setError(t.pwMismatch); return; }

    setSaving(true); setError('');
    try {
      if (isEdit) {
        const body = {
          full_name: fullName.trim(),
          nickname: nickname.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role,
          is_active: isActive,
        };
        if (password) body.password = password;
        const u = await api.updateUser(form.user.id, body);
        setUsers(prev => prev.map(x => (x.id === u.id ? u : x)));
      } else {
        const u = await api.createUser({
          full_name: fullName.trim(),
          nickname: nickname.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          role,
        });
        setUsers(prev => [u, ...prev]);
      }
      setForm(null);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDelError('');
    try {
      const r = await api.deleteUser(delTarget.id);
      if (r?.deactivated && r.user) {
        // ลบไม่ได้เพราะมีเอกสารอ้างอิง → backend เปลี่ยนเป็นระงับให้แทน
        setUsers(prev => prev.map(x => (x.id === r.user.id ? r.user : x)));
      } else {
        setUsers(prev => prev.filter(u => u.id !== delTarget.id));
      }
      setDelTarget(null);
    } catch (err) {
      setDelError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // คอลัมน์ของตาราง (จอกว้าง) + ค้นหา
  const USER_COLS = [
    { label: lang === 'th' ? 'ผู้ใช้' : 'USER' },
    { label: t.email, w: 210 },
    { label: t.phone, w: 116 },
    { label: t.role, w: 116 },
    { label: t.status, w: 92 },
    { label: '', w: 78, rt: true },
  ];
  const shownUsers = (() => {
    const k = q.trim().toLowerCase();
    if (!k) return users;
    return users.filter(u => [nameOf(u), u.nickname, u.email, u.phone]
      .some(v => String(v || '').toLowerCase().includes(k)));
  })();

  if (!isAdmin && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
        <Header title={t.pageTitle} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
        <View style={s.center}>
          <MaterialCommunityIcons name="lock" size={sc(40)} color="#d4a0ac" />
          <Text style={s.adminOnlyText}>{t.adminOnly}</Text>
        </View>
      </View>
    );
  }


  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={t.pageTitle} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loading} lang={lang} />

      {/* แถวเครื่องมือ — จำนวนรายการ และปุ่มสร้างใหม่ (ย้ายมาจากมุมแถบบน) */}
      {!wide && (
        <View style={s.toolbar}>
          <Text style={s.toolbarCount}>
            {users.length} {lang === 'th' ? 'คน' : 'users'}
          </Text>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={openNew} style={s.primaryBtn}>
            <MaterialCommunityIcons name="plus" size={sc(15)} color="#fff5f7" />
            <Text style={s.primaryBtnText}>{lang === 'th' ? 'เพิ่มผู้ใช้' : 'Add user'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={s.content}>
        {wide && (
          <Toolbar>
            <SearchBox value={q} onChangeText={setQ}
              placeholder={lang === 'th' ? 'ค้นหาชื่อ / อีเมล / เบอร์โทร' : 'Search name / email / phone'} />
            <PrimaryButton label={lang === 'th' ? 'เพิ่มผู้ใช้' : 'Add user'} onPress={openNew} />
          </Toolbar>
        )}

        {wide && !loading && (
          <Panel title={t.pageTitle} right={`${shownUsers.length} ${lang === 'th' ? 'คน' : 'users'}`}>
            <TableHead cols={USER_COLS} />
            {shownUsers.length === 0 && <Empty text={t.noUsers} />}
            {shownUsers.map((u, i) => (
              <TableRow key={u.id} cols={USER_COLS} last={i === shownUsers.length - 1}
                onPress={() => openEdit(u)} cells={[
                  <View style={s.rowMain}>
                    <View style={[s.avatarSm, { backgroundColor: u.role === 'admin' ? '#fdf0f2' : '#f6f2f3' }]}>
                      <Text style={[s.avatarSmText, { color: u.role === 'admin' ? '#550a19' : '#9b7d86' }]}>
                        {(nameOf(u) || u.email || '?').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <TdMain text={nameOf(u) || '—'} sub={u.nickname || undefined} />
                  </View>,
                  <Text style={s.cellSub} numberOfLines={1}>{u.email}</Text>,
                  <Text style={s.cellSub} numberOfLines={1}>{u.phone || '—'}</Text>,
                  <Pill label={t.roles[u.role] || u.role} tone={u.role === 'admin' ? 'attn' : 'done'} />,
                  <Pill label={u.is_active === false ? t.statusInactive : t.statusActive}
                    tone={u.is_active === false ? 'dim' : 'done'} />,
                  <View style={s.rowActs}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => openEdit(u)} style={s.actBtn}>
                      <MaterialCommunityIcons name="pencil-outline" size={sc(17)} color="#550a19" />
                    </TouchableOpacity>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { setDelError(''); setDelTarget(u); }} style={s.actBtn}>
                      <MaterialCommunityIcons name="trash-can-outline" size={sc(17)} color="#c0a0a8" />
                    </TouchableOpacity>
                  </View>,
                ]} />
            ))}
          </Panel>
        )}

        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && users.length === 0 && <Text style={s.emptyText}>{t.noUsers}</Text>}
        {!wide && users.map(u => (
          <TouchableOpacity dataSet={{ hov: 'btn' }} key={u.id} activeOpacity={0.7} onPress={() => openEdit(u)} style={s.card}>
            <View style={[s.avatar, { backgroundColor: u.role === 'admin' ? '#fdf0f2' : '#f6f2f3' }]}>
              <Text style={[s.avatarText, { color: u.role === 'admin' ? '#550a19' : '#9b7d86' }]}>
                {(nameOf(u) || u.email || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>
                {nameOf(u) || '—'}
                {!!u.nickname && <Text style={s.userNick}>  ({u.nickname})</Text>}
              </Text>
              <Text style={s.userEmail}>{u.email}</Text>
              {!!u.phone && <Text style={s.userEmail}>{u.phone}</Text>}
              <View style={s.tagRow}>
                <View style={[s.tag, { backgroundColor: u.role === 'admin' ? '#fdf0f2' : '#f6f2f3' }]}>
                  <Text style={[s.tagText, { color: u.role === 'admin' ? '#550a19' : '#9b7d86' }]}>{t.roles[u.role] || u.role}</Text>
                </View>
                <View style={[s.tag, { backgroundColor: u.is_active === false ? '#f5f5f5' : '#e8f5e9' }]}>
                  <Text style={[s.tagText, { color: u.is_active === false ? '#888' : '#1a5c28' }]}>
                    {u.is_active === false ? t.statusInactive : t.statusActive}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => openEdit(u)} style={s.actBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="pencil-outline" size={sc(18)} color="#550a19" />
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { setDelError(''); setDelTarget(u); }} style={s.actBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={sc(18)} color="#c0a0a8" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ADD / EDIT USER MODAL */}
      <Modal visible={!!form} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setForm(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{isEdit ? t.editUser : t.addUser}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setForm(null)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}

            <Text style={s.fieldLabel}>{t.name}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholderTextColor="#c0a0a8" />

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t.nickname} <Text style={s.optional}>{t.optional}</Text></Text>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={nickname} onChangeText={setNickname} placeholderTextColor="#c0a0a8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t.phone} <Text style={s.optional}>{t.optional}</Text></Text>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#c0a0a8" />
              </View>
            </View>

            <Text style={s.fieldLabel}>{t.email}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#c0a0a8" />

            <Text style={s.fieldLabel}>{t.password}</Text>
            <View style={s.pwRow}>
              <TextInput dataSet={{ hov: 'field' }} style={[s.input, { flex: 1, marginBottom: 0 }]} value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} autoCapitalize="none"
                placeholder={isEdit ? '••••••••' : ''} placeholderTextColor="#c0a0a8" />
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
                <MaterialCommunityIcons name={showPw ? 'eye-off' : 'eye'} size={sc(18)} color="#c0a0a8" />
              </TouchableOpacity>
            </View>
            <Text style={s.hint}>{isEdit ? t.pwHintEdit : t.pwHintNew}</Text>

            {(!isEdit || !!password) && (
              <>
                <Text style={[s.fieldLabel, { marginTop: 8 }]}>{t.confirmPw}</Text>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={confirmPw} onChangeText={setConfirmPw}
                  secureTextEntry={!showPw} autoCapitalize="none" placeholderTextColor="#c0a0a8" />
              </>
            )}

            <Text style={[s.fieldLabel, { marginTop: 6 }]}>{t.role}</Text>
            <View style={s.roleRow}>
              {['staff', 'admin'].map(r => (
                <TouchableOpacity dataSet={{ hov: 'btn' }} key={r} onPress={() => setRole(r)}
                  style={[s.roleBtn, { backgroundColor: role === r ? '#550a19' : '#f9f4f5', borderColor: role === r ? '#550a19' : '#e8d5d9' }]}>
                  <MaterialCommunityIcons
                    name={r === 'admin' ? 'crown' : 'account'}
                    size={sc(14)} color={role === r ? '#f5e0e5' : '#a07080'} />
                  <Text style={[s.roleBtnText, { color: role === r ? '#f5e0e5' : '#a07080' }]}>{t.roles[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isEdit && (
              <View style={s.switchRow}>
                <View>
                  <Text style={s.switchLabel}>{t.status}</Text>
                  <Text style={s.hint}>{isActive ? t.statusActive : t.statusInactive}</Text>
                </View>
                <Switch value={isActive} onValueChange={setIsActive}
                  trackColor={{ false: '#e0d0d5', true: '#a8d5b5' }}
                  thumbColor={isActive ? '#1a5c28' : '#fff'} />
              </View>
            )}

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleSave} disabled={saving} style={[s.saveBtn, { opacity: saving ? 0.7 : 1, marginTop: 16 }]}>
              {saving
                ? <ActivityIndicator color="#fff5f7" size="small" />
                : <MaterialCommunityIcons name={isEdit ? 'content-save' : 'account-plus'} size={sc(18)} color="#fff5f7" />}
              <Text style={s.saveBtnText}>{saving ? t.saving : (isEdit ? t.saveEditBtn : t.saveBtn)}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={!!delTarget} animationType="fade" transparent onRequestClose={() => setDelTarget(null)}>
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <MaterialCommunityIcons name="trash-can" size={sc(28)} color="#c62828" style={{ marginBottom: 8 }} />
            <Text style={s.confirmMsg}>{t.deleteConfirm}</Text>
            {delTarget && <Text style={s.confirmName}>{nameOf(delTarget) || delTarget.email}</Text>}
            {!!delError && <Text style={s.confirmErr}>{delError}</Text>}
            <View style={s.confirmBtns}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setDelTarget(null)} style={[s.confirmBtn, { backgroundColor: '#f9f4f5' }]}>
                <Text style={[s.confirmBtnText, { color: '#806070' }]}>{t.confirmNo}</Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleDelete} style={[s.confirmBtn, { backgroundColor: '#c62828' }]}>
                <Text style={[s.confirmBtnText, { color: '#fff' }]}>{t.confirmYes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = {
  toolbar:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  toolbarCount: { flex: 1, fontSize: 12, color: '#9b7d86' },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#550a19', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  primaryBtnText: { fontSize: 12.5, fontWeight: '600', color: '#fff5f7' },
  content:    { padding: 14, paddingBottom: 30 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  adminOnlyText: { fontSize: 14, color: '#a07080', fontWeight: '500' },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowMain:    { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
  avatarSm:   { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  avatarSmText: { fontSize: 13, fontWeight: '600' },
  cellSub:    { fontSize: 11.5, color: '#806070' },
  rowActs:    { flexDirection: 'row', gap: 2, justifyContent: 'flex-end' },
  avatar:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '500' },
  userName:   { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  userNick:   { fontSize: 11, fontWeight: '400', color: '#a07080' },
  userEmail:  { fontSize: 11, color: '#a07080', marginTop: 1 },
  tagRow:     { flexDirection: 'row', gap: 5, marginTop: 5 },
  tag:        { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tagText:    { fontSize: 9, fontWeight: '500' },
  actBtn:     { padding: 5 },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:     { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  optional:   { fontSize: 10, color: '#c0a0a8' },
  hint:       { fontSize: 10, color: '#c0a0a8', marginTop: 4 },
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, padding: 9, fontSize: 13, color: '#2c1015', marginBottom: 10 },
  row2:       { flexDirection: 'row', gap: 10 },
  pwRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 0 },
  eyeBtn:     { padding: 8, marginLeft: -4 },
  roleRow:    { flexDirection: 'row', gap: 8, marginBottom: 6 },
  roleBtn:    { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  roleBtnText:{ fontSize: 12, fontWeight: '500' },
  switchRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  switchLabel:{ fontSize: 12, fontWeight: '500', color: '#2c1015' },
  saveBtn:    { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  saveBtnText:{ fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 280, alignItems: 'center' },
  confirmMsg: { fontSize: 14, color: '#2c1015', textAlign: 'center', marginBottom: 4 },
  confirmName:{ fontSize: 13, fontWeight: '500', color: '#550a19', textAlign: 'center', marginBottom: 16 },
  confirmErr: { fontSize: 11, color: '#a32d2d', textAlign: 'center', marginBottom: 12 },
  confirmBtns:{ flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { fontSize: 13, fontWeight: '500' },
};
