// ══════════════════════════════════════════════════════════════
// ServiceOrderScreen.jsx — ใบสั่งซ่อม (Service Order)
//
// โครงใหม่ (ก.ย. 2569): รหัส SERVICE#00001 รันเอง พิมพ์ทับได้
// ชุดข้อมูล: ลูกค้า · เบอร์ · ประเภทงานซ่อม · จำนวน · วันที่รับ/ส่ง ·
//            รูปของที่ซ่อม 4 รูป · ข้อมูลการซ่อม · หมายเหตุ · ราคา · มัดจำ · รวม
// ผู้รับออเดอร์มาจากคนที่ล็อกอิน — ฝั่งเซิร์ฟเวอร์เป็นคนใส่ ไม่รับจากหน้าจอ
// เอกสารใช้หน้าตาชุดเดียวกับใบสั่งทำ จัดกลุ่มตามลูกค้า (ดู print.js)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import DateInput from '../components/DateInput';
import ShellModal from '../components/ShellModal';
import {
  useWide, Toolbar, SearchBox, Chip, PrimaryButton, Panel,
  TableHead, TableRow, TdNo, TdMain, TdAmt, Pill, Empty,
} from '../components/DataPanel';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printServiceOrder, saveServiceOrder } from '../print';

const JOB_TYPES = ['แหวน', 'แหวนหมั้น', 'สร้อยคอ', 'จี้', 'ต่างหู', 'กำไล', 'อื่นๆ'];

const STATUSES = ['received', 'repairing', 'qc', 'notified', 'picked_up'];
const STATUS_LABELS = {
  th: { received: 'รับเรื่อง', repairing: 'กำลังซ่อม', qc: 'ตรวจสอบ', notified: 'แจ้งลูกค้า', picked_up: 'รับคืนแล้ว' },
  en: { received: 'Received', repairing: 'Repairing', qc: 'QC', notified: 'Notified', picked_up: 'Picked up' },
};
const TONE = { received: 'attn', repairing: 'attn', qc: 'attn', notified: 'attn', picked_up: 'done' };
const FILTERS = [
  { key: 'all', th: 'ทั้งหมด', en: 'All' },
  { key: 'open', th: 'ค้างอยู่', en: 'Open' },
  { key: 'picked_up', th: 'รับคืนแล้ว', en: 'Picked up' },
];
const COLS = [
  { label: '', w: 30 },
  { label: 'รหัสงานซ่อม', w: 150 },
  { label: 'ลูกค้า', w: 160 },
  { label: 'งานที่รับ' },
  { label: 'ส่งงาน', w: 100 },
  { label: 'สถานะ', w: 104 },
  { label: 'คงเหลือ', w: 100, rt: true },
  { label: '', w: 78 },
];

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => Math.round(num(n)).toLocaleString('th-TH');
const dateTH = (v) => { const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('th-TH'); };
const jsonArr = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  return [];
};

const emptyForm = () => ({
  id: null, service_no: '',
  customer_name: '', customer_phone: '',
  job_type: '', job_qty: '1',
  received_at: '', due_date: '',
  photos: [], repair_detail: '', note: '',
  price: '', deposit: '', received_by: '',
});

export default function ServiceOrderScreen({ navigation }) {
  const { styles: s, sc, t: th } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const [lang, setLang] = useState('th');
  const slabs = STATUS_LABELS[lang];

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [filter, setFilter]   = useState('all');
  const [picked, setPicked]   = useState({});
  const [printing, setPrinting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]   = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [sel, setSel] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusErr, setStatusErr]   = useState('');
  const [askDel, setAskDel] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setOrders(await api.getServiceOrders()); } catch (_) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const upd = (patch) => setForm(f => ({ ...f, ...patch }));
  const balance = useMemo(
    () => Math.max(0, num(form.price) - num(form.deposit)),
    [form.price, form.deposit],
  );

  const openNew = async () => {
    setForm(emptyForm()); setError(''); setShowForm(true);
    try {
      const r = await api.nextServiceNo();
      setForm(cur => (cur.id ? cur : { ...cur, service_no: r.service_no || '', received_by: r.received_by || '' }));
    } catch (_) {}
  };

  const openEdit = async (o) => {
    setError(''); setShowForm(true);
    setForm({ ...emptyForm(), id: o.id, service_no: o.service_no || '' });
    let full = o;
    try { full = await api.getServiceOrder(o.id); } catch (_) {}
    setForm({
      ...emptyForm(),
      id: full.id,
      service_no: full.service_no || '',
      customer_name: full.customer_name || '',
      customer_phone: full.customer_phone || '',
      job_type: full.job_type || '',
      job_qty: String(full.job_qty || 1),
      received_at: String(full.received_at || '').slice(0, 10),
      due_date: String(full.due_date || full.pickup_date || '').slice(0, 10),
      photos: jsonArr(full.photos).filter(Boolean).slice(0, 4),
      repair_detail: full.repair_detail || '',
      note: full.note || '',
      price: num(full.price) ? String(num(full.price)) : '',
      deposit: num(full.deposit) ? String(num(full.deposit)) : '',
      received_by: full.received_by || '',
    });
  };

  const pickPhoto = async () => {
    if (form.photos.length >= 4) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (r.canceled || !r.assets?.[0]) return;
      const out = await ImageManipulator.manipulateAsync(
        r.assets[0].uri, [{ resize: { width: 700 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const uri = out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri;
      setForm(f => ({ ...f, photos: [...f.photos, uri].slice(0, 4) }));
    } catch (_) {}
  };
  const dropPhoto = (i) => setForm(f => ({ ...f, photos: f.photos.filter((_, k) => k !== i) }));

  const save = async () => {
    if (!form.customer_name.trim() && !form.job_type.trim()) {
      setError(lang === 'th' ? 'กรอกชื่อลูกค้าหรือประเภทงานซ่อมอย่างน้อยอย่างหนึ่ง' : 'Customer or job type is required');
      return;
    }
    setSaving(true); setError('');
    const payload = {
      service_no: form.service_no.trim(),
      customer_name: form.customer_name.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      job_type: form.job_type.trim() || null,
      job_qty: Math.max(1, parseInt(form.job_qty, 10) || 1),
      received_at: form.received_at.trim() || null,
      due_date: form.due_date.trim() || null,
      photos: form.photos,
      repair_detail: form.repair_detail.trim() || null,
      note: form.note.trim() || null,
      price: num(form.price),
      deposit: num(form.deposit),
    };
    try {
      if (form.id) {
        const updated = await api.updateServiceOrder(form.id, payload);
        setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
        if (sel && sel.id === updated.id) setSel(updated);
      } else {
        const created = await api.createServiceOrder(payload);
        setOrders(prev => [created, ...prev]);
      }
      setShowForm(false); setForm(emptyForm());
    } catch (e) {
      setError(e.message || 'บันทึกไม่สำเร็จ');
    }
    setSaving(false);
  };

  const changeStatus = async (status) => {
    if (!sel) return;
    setStatusBusy(true); setStatusErr('');
    try {
      const updated = await api.updateServiceStatus(sel.id, status);
      setSel(cur => ({ ...cur, ...updated }));
      setOrders(prev => prev.map(o => (o.id === sel.id ? { ...o, ...updated } : o)));
    } catch (e) {
      setStatusErr(e.message || 'เปลี่ยนสถานะไม่สำเร็จ');
    }
    setStatusBusy(false);
  };

  const remove = async () => {
    if (!sel) return;
    try {
      await api.deleteServiceOrder(sel.id);
      setOrders(prev => prev.filter(o => o.id !== sel.id));
      setAskDel(false); setSel(null);
    } catch (_) { setAskDel(false); }
  };

  const togglePick = (id) => setPicked(p => ({ ...p, [id]: !p[id] }));
  const pickedIds = Object.keys(picked).filter(k => picked[k]);
  const printPicked = async (asPdf) => {
    setPrinting(true);
    const full = [];
    for (const id of pickedIds) {
      try { full.push(await api.getServiceOrder(id)); } catch (_) {}
    }
    if (full.length) (asPdf ? saveServiceOrder : printServiceOrder)(full);
    setPrinting(false);
  };

  const needle = q.trim().toLowerCase();
  const shown = orders.filter(o => {
    if (filter === 'open' && o.status === 'picked_up') return false;
    if (filter === 'picked_up' && o.status !== 'picked_up') return false;
    if (!needle) return true;
    return `${o.service_no} ${o.customer_name || ''} ${o.job_type || ''}`.toLowerCase().includes(needle);
  });
  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dueOf = (o) => (num(o.balance) || Math.max(0, num(o.price) - num(o.deposit)));

  const EditBtn = ({ o }) => (
    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => openEdit(o)} style={s.editBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <MaterialCommunityIcons name="pencil-outline" size={sc(13)} color={th.brand} />
      <Text style={s.editText}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบสั่งซ่อม' : 'Service Order'} subtitle={headDate}
        onBack={() => navigation.goBack()} lang={lang}
        onLangToggle={() => setLang(l => (l === 'th' ? 'en' : 'th'))} />
      <ConnectingBar visible={loading} lang={lang} />

      <ScrollView contentContainerStyle={s.content}>
        <Toolbar>
          <SearchBox value={q} onChangeText={setQ}
            placeholder={lang === 'th' ? 'ค้นหารหัสงานซ่อม หรือชื่อลูกค้า' : 'Search code or customer'} />
          {FILTERS.map(f => (
            <Chip key={f.key} label={lang === 'th' ? f.th : f.en} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <PrimaryButton label={lang === 'th' ? 'รับงานซ่อมใหม่' : 'New repair'} onPress={openNew} />
        </Toolbar>

        {pickedIds.length > 0 && (
          <View style={s.pickBar}>
            <Text style={s.pickCount}>
              {lang === 'th' ? `เลือกไว้ ${pickedIds.length} ใบ` : `${pickedIds.length} selected`}
            </Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setPicked({})} style={s.pickClear}>
              <Text style={s.pickClearText}>{lang === 'th' ? 'ล้าง' : 'Clear'}</Text>
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printPicked(false)} disabled={printing} style={s.pickBtn}>
              {printing ? <ActivityIndicator size="small" color={th.brand} />
                : <MaterialCommunityIcons name="printer" size={sc(15)} color={th.brand} />}
              <Text style={s.pickBtnText}>{lang === 'th' ? 'ปริ้นที่เลือก' : 'Print selected'}</Text>
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printPicked(true)} disabled={printing} style={s.pickBtn}>
              <MaterialCommunityIcons name="file-pdf-box" size={sc(15)} color={th.brand} />
              <Text style={s.pickBtnText}>{lang === 'th' ? 'PDF ที่เลือก' : 'Save PDF'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && <ActivityIndicator color={th.brand} style={{ marginTop: 20, marginBottom: 12 }} />}

        <Panel title={lang === 'th' ? 'ใบสั่งซ่อมทั้งหมด' : 'All repairs'}
          right={`${shown.length} ${lang === 'th' ? 'ใบ' : 'orders'}`}>
          {wide && <TableHead cols={COLS} />}
          {!loading && shown.length === 0 && <Empty text={lang === 'th' ? 'ยังไม่มีใบสั่งซ่อม' : 'No repairs yet'} />}
          {shown.map((o, i) => {
            const last = i === shown.length - 1;
            const label = slabs[o.status] || o.status;
            return wide ? (
              <TableRow key={o.id} cols={COLS} last={last} onPress={() => setSel(o)} cells={[
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => togglePick(o.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={[s.box, picked[o.id] && s.boxOn]}>
                    {picked[o.id] && <MaterialCommunityIcons name="check" size={sc(11)} color={th.brandOn} />}
                  </View>
                </TouchableOpacity>,
                <TdNo text={o.service_no} />,
                <TdMain text={o.customer_name || '—'} sub={o.customer_phone || undefined} />,
                <TdMain text={`${o.job_type || '—'}${num(o.job_qty) > 1 ? ` · ${o.job_qty} ชิ้น` : ''}`}
                  sub={o.repair_detail || undefined} />,
                <TdMain text={o.due_date ? dateTH(o.due_date) : '—'} />,
                <Pill label={label} tone={TONE[o.status] || 'done'} />,
                <TdAmt text={num(o.price) ? `฿${fmt(dueOf(o))}` : '—'} />,
                <EditBtn o={o} />,
              ]} />
            ) : (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={o.id} onPress={() => setSel(o)}
                style={[s.mrow, last && { borderBottomWidth: 0 }]}>
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => togglePick(o.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}>
                  <View style={[s.box, picked[o.id] && s.boxOn]}>
                    {picked[o.id] && <MaterialCommunityIcons name="check" size={sc(11)} color={th.brandOn} />}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardNo}>{o.service_no}</Text>
                  <Text style={s.cardTitle}>{o.customer_name || '—'}</Text>
                  <Text style={s.cardSub}>
                    {o.job_type || '—'}{o.due_date ? ` · ส่ง ${dateTH(o.due_date)}` : ''}
                  </Text>
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}><EditBtn o={o} /></View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.cardAmt}>{num(o.price) ? `฿${fmt(dueOf(o))}` : '—'}</Text>
                  <Pill label={label} tone={TONE[o.status] || 'done'} />
                </View>
              </TouchableOpacity>
            );
          })}
        </Panel>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ═══════════ ฟอร์ม ═══════════ */}
      <ShellModal visible={showForm} animationType="slide" presentationStyle="pageSheet"
        onClose={() => setShowForm(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {form.id ? (lang === 'th' ? 'แก้ไขใบสั่งซ่อม' : 'Edit repair')
                       : (lang === 'th' ? 'รับงานซ่อมใหม่' : 'New repair')}
            </Text>
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}

            <Field label={lang === 'th' ? 'รหัสงานซ่อม — รันให้เอง พิมพ์ทับได้' : 'Service code'} s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={[s.input, s.codeIn]} value={form.service_no}
                onChangeText={(v) => upd({ service_no: v })} placeholder="SERVICE#00001"
                placeholderTextColor={th.faint} autoCapitalize="characters" />
            </Field>

            <View style={s.row2}>
              <Field label={lang === 'th' ? 'ชื่อลูกค้า' : 'Customer'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.customer_name}
                  onChangeText={(v) => upd({ customer_name: v })} placeholder="เช่น คุณณิชา รัตนพงศ์"
                  placeholderTextColor={th.faint} />
              </Field>
              <Field label={lang === 'th' ? 'เบอร์โทร' : 'Phone'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.customer_phone}
                  onChangeText={(v) => upd({ customer_phone: v })} keyboardType="phone-pad"
                  placeholder="081-234-5678" placeholderTextColor={th.faint} />
              </Field>
            </View>

            <Field label={lang === 'th' ? 'ประเภทงานซ่อม' : 'Repair type'} s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.job_type}
                onChangeText={(v) => upd({ job_type: v })} placeholder="เช่น แหวน"
                placeholderTextColor={th.faint} />
              <View style={s.chipRow}>
                {JOB_TYPES.map(t => (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} key={t} onPress={() => upd({ job_type: t })}
                    style={[s.tChip, form.job_type === t && s.tChipOn]}>
                    <Text style={[s.tChipText, form.job_type === t && s.tChipTextOn]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <View style={s.row3}>
              <Field label={lang === 'th' ? 'จำนวน (ชิ้น)' : 'Qty'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.job_qty}
                  onChangeText={(v) => upd({ job_qty: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad"
                  placeholder="1" placeholderTextColor={th.faint} />
              </Field>
              <Field label={lang === 'th' ? 'วันที่รับงาน' : 'Received'} s={s} flex>
                <DateInput style={s.input} value={form.received_at} onChangeText={(v) => upd({ received_at: v })} />
              </Field>
              <Field label={lang === 'th' ? 'วันที่ส่งงาน' : 'Due'} s={s} flex>
                <DateInput style={s.input} value={form.due_date} onChangeText={(v) => upd({ due_date: v })} />
              </Field>
            </View>

            <Text style={s.grpLabel}>
              {lang === 'th' ? `รูปของที่ซ่อม — ${form.photos.length}/4` : `Photos — ${form.photos.length}/4`}
            </Text>
            <View style={s.photoRow}>
              {form.photos.map((p, i) => (
                <View key={i} style={s.photoBox}>
                  <Image source={{ uri: p }} style={s.photoImg} resizeMode="cover" />
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => dropPhoto(i)} style={s.photoX}>
                    <MaterialCommunityIcons name="close" size={sc(13)} color={th.brandOn} />
                  </TouchableOpacity>
                </View>
              ))}
              {form.photos.length < 4 && (
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={pickPhoto} style={[s.photoBox, s.photoAdd]}>
                  <MaterialCommunityIcons name="image-plus" size={sc(18)} color={th.faint} />
                  <Text style={s.photoAddText}>{lang === 'th' ? 'เพิ่มรูป' : 'Add'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Field label={lang === 'th' ? 'ข้อมูลการซ่อม' : 'Repair detail'} s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={[s.input, { height: 74, textAlignVertical: 'top' }]}
                value={form.repair_detail} onChangeText={(v) => upd({ repair_detail: v })} multiline
                placeholder="อาการ · สิ่งที่ต้องซ่อม" placeholderTextColor={th.faint} />
            </Field>

            <Field label={lang === 'th' ? 'หมายเหตุ' : 'Notes'} s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                value={form.note} onChangeText={(v) => upd({ note: v })} multiline
                placeholder="สิ่งที่ต้องระวัง" placeholderTextColor={th.faint} />
            </Field>

            <Text style={s.grpLabel}>{lang === 'th' ? 'ราคา' : 'Price'}</Text>
            <View style={s.row2}>
              <Field label={lang === 'th' ? 'ราคา' : 'Price'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.price}
                  onChangeText={(v) => upd({ price: v })} keyboardType="numeric"
                  placeholder="0" placeholderTextColor={th.faint} />
              </Field>
              <Field label={lang === 'th' ? 'มัดจำ' : 'Deposit'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.deposit}
                  onChangeText={(v) => upd({ deposit: v })} keyboardType="numeric"
                  placeholder="0" placeholderTextColor={th.faint} />
              </Field>
            </View>
            <View style={s.totalBox}>
              <Text style={s.totalLabel}>{lang === 'th' ? 'รวม (ราคา − มัดจำ)' : 'Balance'}</Text>
              <Text style={s.totalVal}>฿{fmt(balance)}</Text>
            </View>

            <Field label={lang === 'th' ? 'ผู้รับออเดอร์' : 'Received by'} s={s}>
              <View style={[s.input, s.lockBox]}>
                <MaterialCommunityIcons name="account-check-outline" size={sc(14)} color={th.brand} />
                <Text style={s.lockText}>{form.received_by || (lang === 'th' ? 'จากคนที่ล็อกอิน' : 'from login')}</Text>
              </View>
            </Field>

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={save} disabled={saving}
              style={[s.saveBtn, saving && { opacity: 0.7 }]}>
              <Text style={s.saveText}>
                {saving ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                        : form.id ? (lang === 'th' ? 'บันทึกการแก้ไข' : 'Save changes')
                                  : (lang === 'th' ? 'บันทึกใบสั่งซ่อม' : 'Save repair')}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </ShellModal>

      {/* ═══════════ ดูใบ ═══════════ */}
      <ShellModal visible={!!sel} animationType="slide" presentationStyle="pageSheet"
        onClose={() => { setSel(null); setAskDel(false); }}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{sel?.service_no}</Text>
            {!!sel && (
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { const o = sel; setSel(null); openEdit(o); }}
                style={s.editBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={sc(13)} color={th.brand} />
                <Text style={s.editText}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            {!!sel && (
              <>
                <View style={s.card}>
                  <InfoLine s={s} k="ลูกค้า" v={sel.customer_name || '—'} />
                  <InfoLine s={s} k="เบอร์โทร" v={sel.customer_phone || '—'} />
                  <InfoLine s={s} k="ประเภทงานซ่อม" v={`${sel.job_type || '—'} · ${sel.job_qty || 1} ชิ้น`} />
                  <InfoLine s={s} k="วันที่รับงาน" v={sel.received_at ? dateTH(sel.received_at) : '—'} />
                  <InfoLine s={s} k="วันที่ส่งงาน" v={sel.due_date ? dateTH(sel.due_date) : '—'} />
                  {!!sel.repair_detail && <InfoLine s={s} k="ข้อมูลการซ่อม" v={sel.repair_detail} />}
                  {!!sel.note && <InfoLine s={s} k="หมายเหตุ" v={sel.note} />}
                  <InfoLine s={s} k="ราคา" v={`฿${fmt(sel.price)}`} />
                  <InfoLine s={s} k="มัดจำ" v={`฿${fmt(sel.deposit)}`} />
                  <InfoLine s={s} k="รวม" v={`฿${fmt(dueOf(sel))}`} />
                  <InfoLine s={s} k="ผู้รับออเดอร์" v={sel.received_by || '—'} />
                </View>

                <View style={s.card}>
                  <Text style={s.secTitle}>สถานะ</Text>
                  {!!statusErr && <View style={s.errBox}><Text style={s.errText}>{statusErr}</Text></View>}
                  <View style={[s.chipRow, statusBusy && { opacity: 0.5 }]}>
                    {STATUSES.map(st => (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} key={st} disabled={statusBusy}
                        onPress={() => changeStatus(st)}
                        style={[s.tChip, sel.status === st && s.tChipOn]}>
                        <Text style={[s.tChipText, sel.status === st && s.tChipTextOn]}>{slabs[st]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s.actRow}>
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printServiceOrder(sel)} style={s.actBtn}>
                    <MaterialCommunityIcons name="printer" size={sc(15)} color={th.brand} />
                    <Text style={s.actText}>ปริ้น</Text>
                  </TouchableOpacity>
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => saveServiceOrder(sel)} style={s.actBtn}>
                    <MaterialCommunityIcons name="file-pdf-box" size={sc(15)} color={th.brand} />
                    <Text style={s.actText}>บันทึก PDF</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setAskDel(true)} style={s.delBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={sc(14)} color={th.danger} />
                  <Text style={s.delText}>{lang === 'th' ? 'ลบใบสั่งซ่อม' : 'Delete'}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </ShellModal>

      {/* ═══════════ ยืนยันลบ ═══════════ */}
      <ShellModal visible={askDel} animationType="fade" transparent onRequestClose={() => setAskDel(false)}>
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <Text style={s.modalTitle}>ลบใบสั่งซ่อม</Text>
            <Text style={s.confirmMsg}>{sel?.service_no} — ลบแล้วเอากลับไม่ได้</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setAskDel(false)}
                style={[s.confirmBtn, { backgroundColor: th.card2 }]}>
                <Text style={[s.confirmBtnText, { color: th.dim }]}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={remove}
                style={[s.confirmBtn, { backgroundColor: th.danger }]}>
                <Text style={[s.confirmBtnText, { color: th.brandOn }]}>ลบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ShellModal>
    </View>
  );
}

function Field({ label, children, s, flex }) {
  return (
    <View style={[s.field, flex && { flex: 1, minWidth: 140 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}
function InfoLine({ k, v, s }) {
  return (
    <View style={s.infoLine}>
      <Text style={s.infoK}>{k}</Text>
      <Text style={s.infoV}>{v}</Text>
    </View>
  );
}

const baseStyles = (th) => ({
  content: { padding: 14, paddingBottom: 30 },
  box: { width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: th.line3, justifyContent: 'center', alignItems: 'center' },
  boxOn: { backgroundColor: th.brandBg, borderColor: th.brandBg },

  pickBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, backgroundColor: th.soft, borderWidth: 1, borderColor: th.hair, borderRadius: 12, padding: 11, marginBottom: 12 },
  pickCount: { flex: 1, minWidth: 100, fontSize: 13, color: th.brand, fontWeight: '600' },
  pickClear: { paddingVertical: 6, paddingHorizontal: 10 },
  pickClearText: { fontSize: 12.5, color: th.muted },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: th.card, borderWidth: 1, borderColor: th.line2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 13 },
  pickBtnText: { fontSize: 12.5, color: th.brand, fontWeight: '500' },

  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: th.line2, backgroundColor: th.card, alignSelf: 'flex-start' },
  editText: { fontSize: 12, color: th.brand, fontWeight: '500' },

  mrow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.hair },
  cardNo: { fontSize: 12, color: th.muted, letterSpacing: 0.4 },
  cardTitle: { fontSize: 14, color: th.ink, fontWeight: '500', marginTop: 1 },
  cardSub: { fontSize: 12, color: th.muted, marginTop: 2 },
  cardAmt: { fontSize: 14, color: th.brand, fontWeight: '600' },

  modal: { flex: 1, backgroundColor: th.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingRight: 56, borderBottomWidth: 1, borderBottomColor: th.line, backgroundColor: th.card },
  modalTitle: { fontSize: 16, fontWeight: '600', color: th.brand },
  modalBody: { padding: 16, paddingBottom: 40 },

  grpLabel: { fontSize: 11, letterSpacing: 1.4, color: th.muted, fontWeight: '600', marginTop: 18, marginBottom: 10 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: th.muted, marginBottom: 5 },
  input: { backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: th.ink },
  codeIn: { fontWeight: '600', color: th.brand, letterSpacing: 0.6 },
  lockBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: th.soft, borderColor: th.hair },
  lockText: { fontSize: 13.5, color: th.brand, fontWeight: '500', flex: 1, minWidth: 0 },

  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  row3: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 7 },
  tChip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: th.line2, backgroundColor: th.card },
  tChipOn: { backgroundColor: th.brandBg, borderColor: th.brandBg },
  tChipText: { fontSize: 12.5, color: th.muted2 },
  tChipTextOn: { color: th.brandOn },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 },
  photoBox: { width: 96, height: 96, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: th.line, backgroundColor: th.card },
  photoImg: { width: '100%', height: '100%' },
  photoX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(85,10,25,0.85)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: th.bg },
  photoAddText: { fontSize: 11, color: th.muted },

  totalBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, backgroundColor: th.soft, borderWidth: 1, borderColor: th.hair, borderRadius: 12, padding: 14, marginBottom: 12 },
  totalLabel: { fontSize: 12.5, color: th.brand2 },
  totalVal: { fontSize: 20, fontWeight: '700', color: th.brand },

  saveBtn: { backgroundColor: th.brandBg, borderRadius: 11, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveText: { color: th.brandOn, fontSize: 15, fontWeight: '600' },

  errBox: { backgroundColor: th.soft, borderWidth: 1, borderColor: th.line3, borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: th.danger },

  card: { backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 12, padding: 14, marginBottom: 12 },
  secTitle: { fontSize: 13.5, fontWeight: '600', color: th.brand, marginBottom: 4 },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: th.hair },
  infoK: { width: 116, fontSize: 12.5, color: th.muted },
  infoV: { flex: 1, fontSize: 13, color: th.ink, minWidth: 0 },

  actRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  actBtn: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: th.line2, backgroundColor: th.card },
  actText: { fontSize: 13.5, color: th.brand, fontWeight: '500' },

  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 12 },
  delText: { fontSize: 13, color: th.danger, fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { backgroundColor: th.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 },
  confirmMsg: { fontSize: 12.5, color: th.muted, lineHeight: 20, marginTop: 8, marginBottom: 14 },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { fontSize: 13.5, fontWeight: '600' },
});
