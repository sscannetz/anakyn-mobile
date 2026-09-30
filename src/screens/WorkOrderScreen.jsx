// ══════════════════════════════════════════════════════════════
// WorkOrderScreen.jsx — ใบสั่งทำ (Custom Order)
//
// โครง (ก.ย. 2569 รอบ 2): 1 ใบมีได้หลายงาน
//   ระดับใบ  → ลูกค้า · เบอร์ · วันที่รับ/ส่ง · การชำระเงินหลายครั้ง · ผู้รับออเดอร์
//   ระดับงาน → รหัส CUSTOM#xxxxx · ประเภท · ตัวเรือน · น้ำหนักทอง · เพชร · รูป 4 รูป · ราคา
//
// ผู้รับออเดอร์ไม่ให้พิมพ์เอง — backend ใส่ชื่อคนที่ล็อกอินให้เสมอ
// เอกสารจัดกลุ่มตามลูกค้า ลูกค้าเดียวกันลิสต์แผ่นเดียว คนละคนแยกแผ่น (ดู print.js)
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
import SelectInput from '../components/SelectInput';
import {
  useWide, Toolbar, SearchBox, Chip, PrimaryButton, Panel,
  TableHead, TableRow, TdNo, TdMain, TdAmt, Pill, Empty,
} from '../components/DataPanel';
import { SHAPES, COLORS as DIA_COLORS, CLARITY, METAL_TABS } from '../components/ProductForm';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printWorkOrder, saveWorkOrder, printBlankWorkOrder } from '../print';

const COLORS = [
  { key: 'white',  label: 'White gold' },
  { key: 'yellow', label: 'Yellow gold' },
  { key: 'light',  label: 'Light gold' },
  { key: 'rose',   label: 'Rose gold' },
  { key: 'silver', label: 'Silver' },
];
const JOB_TYPES = ['แหวน', 'แหวนหมั้น', 'สร้อยคอ', 'จี้', 'ต่างหู', 'กำไล', 'อื่นๆ'];

const STATUSES = ['ordered', 'in_production', 'qc', 'delivered'];
const STATUS_LABEL = {
  th: { ordered: 'สั่งแล้ว', in_production: 'กำลังผลิต', qc: 'ตรวจงาน', delivered: 'ส่งมอบแล้ว' },
  en: { ordered: 'Ordered', in_production: 'In production', qc: 'QC', delivered: 'Delivered' },
};
const TONE = { ordered: 'attn', in_production: 'attn', qc: 'attn', delivered: 'done' };
const FILTERS = [
  { key: 'all', th: 'ทั้งหมด', en: 'All' },
  { key: 'open', th: 'ยังไม่ส่งมอบ', en: 'Open' },
  { key: 'delivered', th: 'ส่งมอบแล้ว', en: 'Delivered' },
];
const COLS = [
  { label: '', w: 30 },
  { label: 'รหัสงาน', w: 150 },
  { label: 'ลูกค้า', w: 160 },
  { label: 'งานที่สั่ง' },
  { label: 'ส่งงาน', w: 100 },
  { label: 'สถานะ', w: 100 },
  { label: 'คงเหลือ', w: 104, rt: true },
  { label: '', w: 78 },
];

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => Math.round(num(n)).toLocaleString('th-TH');
const dateTH = (v) => { const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('th-TH'); };
const uid = () => Date.now() + Math.random();
const jsonArr = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  return [];
};

const newStone = () => ({ id: uid(), shape: '', color: '', clarity: '', carat: '', qty: '1', has_cert: false, cert_no: '' });
const newJob = (code = '') => ({
  id: uid(), job_code: code, job_type: '', metal_color: 'white', metal_type: '18K',
  unit_weight_g: '', qty: '1', ring_size: '', engrave: '', note: '', price: '',
  photos: [], stones: [newStone()],
});
const newPay = () => ({ id: uid(), amount: '', note: '' });

// รหัสงานถัดไปจากรหัสที่มีอยู่ เช่น CUSTOM#00834 → CUSTOM#00835
const bumpCode = (code, step = 1) => {
  const m = String(code || '').match(/^(.*?)(\d+)$/);
  if (!m) return '';
  return m[1] + String(parseInt(m[2], 10) + step).padStart(m[2].length, '0');
};

const emptyForm = () => ({
  id: null,
  customer_name: '', customer_phone: '',
  ordered_at: '', due_date: '',
  job_note: '', is_urgent: false,
  received_by: '',
  jobs: [newJob()],
  payments: [newPay()],
});

export default function WorkOrderScreen({ navigation }) {
  const { styles: s, sc } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const [lang, setLang] = useState('th');
  const slabs = STATUS_LABEL[lang];

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

  const [sel, setSel]         = useState(null);
  const [selBusy, setSelBusy] = useState(false);
  const [stockForm, setStockForm] = useState(null);
  const [stockBusy, setStockBusy] = useState(false);
  const [stockErr, setStockErr]   = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusErr, setStatusErr]   = useState('');
  const [askDeliver, setAskDeliver] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setOrders(await api.getWorkOrders()); } catch (_) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const upd  = (patch) => setForm(f => ({ ...f, ...patch }));
  const updJ = (jid, patch) => setForm(f => ({ ...f, jobs: f.jobs.map(j => (j.id === jid ? { ...j, ...patch } : j)) }));
  const updS = (jid, sid, patch) => setForm(f => ({
    ...f,
    jobs: f.jobs.map(j => (j.id === jid ? { ...j, stones: j.stones.map(st => (st.id === sid ? { ...st, ...patch } : st)) } : j)),
  }));
  const updP = (pid, patch) => setForm(f => ({ ...f, payments: f.payments.map(p => (p.id === pid ? { ...p, ...patch } : p)) }));

  const grandTotal = useMemo(() => form.jobs.reduce((t, j) => t + num(j.price), 0), [form.jobs]);
  const paidTotal  = useMemo(() => form.payments.reduce((t, p) => t + num(p.amount), 0), [form.payments]);

  const openNew = async () => {
    setForm(emptyForm()); setError(''); setShowForm(true);
    try {
      const r = await api.nextWorkNo();
      setForm(cur => (cur.id ? cur : {
        ...cur,
        received_by: r.received_by || '',
        jobs: cur.jobs.map((j, i) => (i === 0 ? { ...j, job_code: r.job_code || '' } : j)),
      }));
    } catch (_) {}
  };

  const openEdit = async (o) => {
    setError(''); setShowForm(true);
    setForm({ ...emptyForm(), id: o.id, customer_name: o.customer_name || '' });
    let full = o;
    try { full = await api.getWorkOrder(o.id); } catch (_) {}
    const items = (full.items || []);
    const pays = jsonArr(full.payments);
    setForm({
      ...emptyForm(),
      id: full.id,
      customer_name: full.customer_name || '',
      customer_phone: full.customer_phone || '',
      ordered_at: String(full.ordered_at || '').slice(0, 10),
      due_date: String(full.due_date || '').slice(0, 10),
      job_note: full.job_note || '',
      is_urgent: !!full.is_urgent,
      received_by: full.received_by || '',
      jobs: items.length ? items.map(it => ({
        id: uid(),
        job_code: it.job_code || '',
        job_type: it.job_type || it.name || '',
        metal_color: it.metal_color || 'white',
        metal_type: it.metal_type || '18K',
        unit_weight_g: num(it.unit_weight_g) ? String(num(it.unit_weight_g)) : '',
        qty: String(it.qty || 1),
        ring_size: it.ring_size || '',
        engrave: it.engrave || '',
        note: it.note || '',
        price: num(it.price) ? String(num(it.price)) : '',
        photos: jsonArr(it.photos).filter(Boolean).slice(0, 4),
        stones: (jsonArr(it.stones).length ? jsonArr(it.stones) : [{}]).map(st => ({
          id: uid(), shape: st.shape || '', color: st.color || '', clarity: st.clarity || '',
          carat: String(st.carat ?? ''), qty: String(st.qty || 1),
          has_cert: !!st.has_cert, cert_no: st.cert_no || '',
        })),
      })) : [newJob()],
      payments: pays.length ? pays.map(p => ({ id: uid(), amount: String(num(p.amount) || ''), note: p.note || '' })) : [newPay()],
    });
  };

  const addJob = () => setForm(f => {
    const last = f.jobs[f.jobs.length - 1];
    return { ...f, jobs: [...f.jobs, newJob(bumpCode(last?.job_code))] };
  });

  const pickPhoto = async (jid) => {
    const job = form.jobs.find(j => j.id === jid);
    if (!job || job.photos.length >= 4) return;
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
      setForm(f => ({ ...f, jobs: f.jobs.map(j => (j.id === jid ? { ...j, photos: [...j.photos, uri].slice(0, 4) } : j)) }));
    } catch (_) {}
  };
  const dropPhoto = (jid, i) => setForm(f => ({
    ...f, jobs: f.jobs.map(j => (j.id === jid ? { ...j, photos: j.photos.filter((_, k) => k !== i) } : j)),
  }));

  const save = async () => {
    const jobs = form.jobs.filter(j => j.job_type.trim() || num(j.price) || j.photos.length);
    if (jobs.length === 0) {
      setError(lang === 'th' ? 'ใส่อย่างน้อย 1 งาน (ประเภทงานหรือราคา)' : 'At least one job is required');
      return;
    }
    setSaving(true); setError('');
    const payload = {
      customer_name: form.customer_name.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      ordered_at: form.ordered_at.trim() || null,
      due_date: form.due_date.trim() || null,
      job_note: form.job_note.trim() || null,
      is_urgent: form.is_urgent,
      payments: form.payments.filter(p => num(p.amount) > 0).map(p => ({ amount: num(p.amount), note: p.note.trim() })),
      items: jobs.map(j => ({
        job_code: j.job_code.trim(),
        job_type: j.job_type.trim() || null,
        metal_color: j.metal_color,
        metal_type: j.metal_type,
        unit_weight_g: num(j.unit_weight_g),
        qty: Math.max(1, parseInt(j.qty, 10) || 1),
        ring_size: j.ring_size.trim() || null,
        engrave: j.engrave.trim() || null,
        note: j.note.trim() || null,
        price: num(j.price),
        photos: j.photos,
        stones: j.stones
          .filter(st => st.shape.trim() || st.carat || st.cert_no.trim())
          .map(st => ({
            shape: st.shape.trim(), color: st.color.trim(), clarity: st.clarity.trim(),
            carat: num(st.carat), qty: Math.max(1, parseInt(st.qty, 10) || 1),
            has_cert: !!st.has_cert, cert_no: st.cert_no.trim(),
          })),
      })),
    };
    try {
      if (form.id) {
        const updated = await api.updateWorkOrder(form.id, payload);
        setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated, item_count: updated.items?.length || 1 } : o)));
        if (sel && sel.id === updated.id) setSel(updated);
      } else {
        const created = await api.createWorkOrder(payload);
        setOrders(prev => [{ ...created, item_count: created.items?.length || 1 }, ...prev]);
      }
      setShowForm(false); setForm(emptyForm());
    } catch (e) {
      setError(e.message || 'บันทึกไม่สำเร็จ');
    }
    setSaving(false);
  };

  const openOrder = async (o) => {
    setSel({ ...o, items: [] }); setSelBusy(true);
    try { setSel(await api.getWorkOrder(o.id)); } catch (_) {}
    setSelBusy(false);
  };

  const applyStatus = async (status) => {
    if (!sel) return null;
    setStatusBusy(true); setStatusErr('');
    try {
      const updated = await api.updateWorkOrderStatus(sel.id, status);
      setSel(cur => ({ ...cur, ...updated }));
      setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
      setStatusBusy(false);
      return updated;
    } catch (e) {
      setStatusErr(e.message || 'เปลี่ยนสถานะไม่สำเร็จ');
      setStatusBusy(false);
      return null;
    }
  };
  const changeStatus = (status) => {
    if (status === 'delivered') { setStatusErr(''); setAskDeliver(true); return; }
    applyStatus(status);
  };

  // เปิดหน้าต่างเพิ่มเข้าสต๊อก — รหัสสินค้ารันใหม่ ไม่ใช้รหัสงาน
  const openStock = async (item, fromDeliver = false) => {
    setStockErr('');
    setStockForm({ item, sku: '', sale_price: String(num(item.price) || ''), fromDeliver });
    try {
      const r = await api.nextStockSku();
      setStockForm(cur => (cur && cur.item.id === item.id ? { ...cur, sku: r.sku || '' } : cur));
    } catch (_) {}
  };
  const openNextStock = (list) => {
    const next = (list || []).find(i => !i.stocked_product_id);
    if (!next) return false;
    openStock(next, true);
    return true;
  };
  const confirmDeliver = async () => {
    const updated = await applyStatus('delivered');
    setAskDeliver(false);
    if (updated) openNextStock(sel?.items || []);
  };
  const skipStock = () => {
    const back = stockForm?.fromDeliver;
    setStockForm(null);
    if (back) setSel(null);
  };

  const sendToStock = async () => {
    if (!stockForm) return;
    setStockBusy(true); setStockErr('');
    try {
      const r = await api.workItemToStock(sel.id, stockForm.item.id, {
        sku: stockForm.sku.trim(), sale_price: num(stockForm.sale_price),
      });
      const nextItems = (sel.items || []).map(i =>
        (i.id === stockForm.item.id ? { ...i, stocked_product_id: r.product?.id || i.stocked_product_id } : i));
      setSel(cur => ({ ...cur, items: nextItems }));
      if (stockForm.fromDeliver) {
        const next = nextItems.find(i => !i.stocked_product_id);
        if (next) { setStockBusy(false); openStock(next, true); return; }
        setStockForm(null); setSel(null);
      } else {
        setStockForm(null);
      }
    } catch (e) {
      setStockErr(e.message || 'เพิ่มเข้าสต๊อกไม่สำเร็จ');
    }
    setStockBusy(false);
  };

  const togglePick = (id) => setPicked(p => ({ ...p, [id]: !p[id] }));
  const pickedIds = Object.keys(picked).filter(k => picked[k]);
  const printPicked = async (asPdf) => {
    setPrinting(true);
    const full = [];
    for (const id of pickedIds) {
      try { full.push(await api.getWorkOrder(id)); } catch (_) {}
    }
    if (full.length) (asPdf ? saveWorkOrder : printWorkOrder)(full);
    setPrinting(false);
  };

  const needle = q.trim().toLowerCase();
  const shown = orders.filter(o => {
    if (filter === 'open' && o.status === 'delivered') return false;
    if (filter === 'delivered' && o.status !== 'delivered') return false;
    if (!needle) return true;
    return `${o.work_no} ${o.customer_name || ''} ${o.job_code || ''}`.toLowerCase().includes(needle);
  });
  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const codeOf = (o) => {
    const n = num(o.item_count) || 1;
    const base = o.first_job_code || o.work_no;
    return n > 1 ? `${base} +${n - 1}` : base;
  };
  const dueOf = (o) => Math.max(0, num(o.grand_total) - num(o.paid_total));

  const EditBtn = ({ o }) => (
    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => openEdit(o)} style={s.editBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <MaterialCommunityIcons name="pencil-outline" size={sc(13)} color="#550a19" />
      <Text style={s.editText}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบสั่งทำ' : 'Custom Order'} subtitle={headDate}
        onBack={() => navigation.goBack()} lang={lang}
        onLangToggle={() => setLang(l => (l === 'th' ? 'en' : 'th'))} />
      <ConnectingBar visible={loading} lang={lang} />

      <ScrollView contentContainerStyle={s.content}>
        <Toolbar>
          <SearchBox value={q} onChangeText={setQ}
            placeholder={lang === 'th' ? 'ค้นหารหัสงาน หรือชื่อลูกค้า' : 'Search job code or customer'} />
          {FILTERS.map(f => (
            <Chip key={f.key} label={lang === 'th' ? f.th : f.en} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={printBlankWorkOrder} style={s.ghostBtn}>
            <MaterialCommunityIcons name="file-outline" size={sc(14)} color="#550a19" />
            <Text style={s.ghostText}>{lang === 'th' ? 'ปริ้นใบเปล่า' : 'Blank form'}</Text>
          </TouchableOpacity>
          <PrimaryButton label={lang === 'th' ? 'เปิดใบสั่งทำใหม่' : 'New order'} onPress={openNew} />
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
              {printing ? <ActivityIndicator size="small" color="#550a19" />
                : <MaterialCommunityIcons name="printer" size={sc(15)} color="#550a19" />}
              <Text style={s.pickBtnText}>{lang === 'th' ? 'ปริ้นที่เลือก' : 'Print selected'}</Text>
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printPicked(true)} disabled={printing} style={s.pickBtn}>
              <MaterialCommunityIcons name="file-pdf-box" size={sc(15)} color="#550a19" />
              <Text style={s.pickBtnText}>{lang === 'th' ? 'PDF ที่เลือก' : 'Save PDF'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20, marginBottom: 12 }} />}

        <Panel title={lang === 'th' ? 'ใบสั่งทำทั้งหมด' : 'All orders'}
          right={`${shown.length} ${lang === 'th' ? 'ใบ' : 'orders'}`}>
          {wide && <TableHead cols={COLS} />}
          {!loading && shown.length === 0 && <Empty text={lang === 'th' ? 'ยังไม่มีใบสั่งทำ' : 'No orders yet'} />}
          {shown.map((o, i) => {
            const last = i === shown.length - 1;
            const label = slabs[o.status] || o.status;
            return wide ? (
              <TableRow key={o.id} cols={COLS} last={last} onPress={() => openOrder(o)} cells={[
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => togglePick(o.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={[s.box, picked[o.id] && s.boxOn]}>
                    {picked[o.id] && <MaterialCommunityIcons name="check" size={sc(11)} color="#fff" />}
                  </View>
                </TouchableOpacity>,
                <TdNo text={codeOf(o)} />,
                <TdMain text={o.customer_name || '—'} sub={o.customer_phone || undefined} />,
                <TdMain text={`${num(o.item_count) || 1} ${lang === 'th' ? 'งาน' : 'jobs'}`}
                  sub={num(o.grand_total) ? `รวม ฿${fmt(o.grand_total)}` : undefined} />,
                <TdMain text={o.due_date ? dateTH(o.due_date) : '—'} />,
                <Pill label={label} tone={TONE[o.status] || 'done'} />,
                <TdAmt text={num(o.grand_total) ? `฿${fmt(dueOf(o))}` : '—'} />,
                <EditBtn o={o} />,
              ]} />
            ) : (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={o.id} onPress={() => openOrder(o)}
                style={[s.mrow, last && { borderBottomWidth: 0 }]}>
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => togglePick(o.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}>
                  <View style={[s.box, picked[o.id] && s.boxOn]}>
                    {picked[o.id] && <MaterialCommunityIcons name="check" size={sc(11)} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardNo}>{codeOf(o)}</Text>
                  <Text style={s.cardTitle}>{o.customer_name || '—'}</Text>
                  <Text style={s.cardSub}>
                    {num(o.item_count) || 1} งาน
                    {o.due_date ? ` · ส่ง ${dateTH(o.due_date)}` : ''}
                  </Text>
                  <View style={{ marginTop: 6, alignSelf: 'flex-start' }}><EditBtn o={o} /></View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.cardAmt}>{num(o.grand_total) ? `฿${fmt(dueOf(o))}` : '—'}</Text>
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
              {form.id ? (lang === 'th' ? 'แก้ไขใบสั่งทำ' : 'Edit order')
                       : (lang === 'th' ? 'เปิดใบสั่งทำใหม่' : 'New order')}
            </Text>
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}

            <Text style={s.grpLabel}>{lang === 'th' ? 'ข้อมูลลูกค้า' : 'Customer'}</Text>
            <View style={s.row2}>
              <Field label={lang === 'th' ? 'ชื่อลูกค้า' : 'Customer'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.customer_name}
                  onChangeText={(v) => upd({ customer_name: v })} placeholder="เช่น คุณณิชา รัตนพงศ์"
                  placeholderTextColor="#c0a0a8" />
              </Field>
              <Field label={lang === 'th' ? 'เบอร์โทร' : 'Phone'} s={s} flex>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={form.customer_phone}
                  onChangeText={(v) => upd({ customer_phone: v })} keyboardType="phone-pad"
                  placeholder="081-234-5678" placeholderTextColor="#c0a0a8" />
              </Field>
            </View>
            <View style={s.row3}>
              <Field label={lang === 'th' ? 'วันที่รับงาน' : 'Received'} s={s} flex>
                <DateInput style={s.input} value={form.ordered_at} onChangeText={(v) => upd({ ordered_at: v })} />
              </Field>
              <Field label={lang === 'th' ? 'วันที่ส่งงาน' : 'Due'} s={s} flex>
                <DateInput style={s.input} value={form.due_date} onChangeText={(v) => upd({ due_date: v })} />
              </Field>
              <Field label={lang === 'th' ? 'ผู้รับออเดอร์' : 'Received by'} s={s} flex>
                <View style={[s.input, s.lockBox]}>
                  <MaterialCommunityIcons name="account-check-outline" size={sc(14)} color="#550a19" />
                  <Text style={s.lockText}>{form.received_by || (lang === 'th' ? 'จากคนที่ล็อกอิน' : 'from login')}</Text>
                </View>
              </Field>
            </View>

            {/* ── งานแต่ละชิ้น ── */}
            {form.jobs.map((j, ji) => (
              <View key={j.id} style={s.jobCard}>
                <View style={s.jobHead}>
                  <Text style={s.jobNo}>{lang === 'th' ? `งานที่ ${ji + 1}` : `Job ${ji + 1}`}</Text>
                  {form.jobs.length > 1 && (
                    <TouchableOpacity dataSet={{ hov: 'btn' }}
                      onPress={() => setForm(f => ({ ...f, jobs: f.jobs.filter(x => x.id !== j.id) }))}>
                      <MaterialCommunityIcons name="close" size={sc(16)} color="#9b7d86" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={s.row2}>
                  <Field label={lang === 'th' ? 'รหัสงาน — รันให้เอง พิมพ์ทับได้' : 'Job code'} s={s} flex>
                    <TextInput dataSet={{ hov: 'field' }} style={[s.input, s.codeIn]} value={j.job_code}
                      onChangeText={(v) => updJ(j.id, { job_code: v })} placeholder="CUSTOM#00001"
                      placeholderTextColor="#c0a0a8" autoCapitalize="characters" />
                  </Field>
                  <Field label={lang === 'th' ? 'ราคา (บาท)' : 'Price'} s={s} flex>
                    <TextInput dataSet={{ hov: 'field' }} style={s.input} value={j.price}
                      onChangeText={(v) => updJ(j.id, { price: v })} keyboardType="numeric"
                      placeholder="0" placeholderTextColor="#c0a0a8" />
                  </Field>
                </View>

                <Field label={lang === 'th' ? 'ประเภทงาน' : 'Job type'} s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={j.job_type}
                    onChangeText={(v) => updJ(j.id, { job_type: v })} placeholder="เช่น แหวนหมั้น"
                    placeholderTextColor="#c0a0a8" />
                  <View style={s.chipRow}>
                    {JOB_TYPES.map(t => (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} key={t} onPress={() => updJ(j.id, { job_type: t })}
                        style={[s.tChip, j.job_type === t && s.tChipOn]}>
                        <Text style={[s.tChipText, j.job_type === t && s.tChipTextOn]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                <Field label={lang === 'th' ? 'ตัวเรือน' : 'Metal colour'} s={s}>
                  <View style={s.chipRow}>
                    {COLORS.map(c => (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} key={c.key} onPress={() => updJ(j.id, { metal_color: c.key })}
                        style={[s.tChip, j.metal_color === c.key && s.tChipOn]}>
                        <Text style={[s.tChipText, j.metal_color === c.key && s.tChipTextOn]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                <Field label={lang === 'th' ? '% ตัวเรือน' : 'Karat'} s={s}>
                  <View style={s.metalTabs}>
                    {METAL_TABS.map((tb, i) => {
                      const on = j.metal_type === tb.key;
                      return (
                        <TouchableOpacity dataSet={{ hov: 'btn' }} key={tb.key} onPress={() => updJ(j.id, { metal_type: tb.key })}
                          style={[s.metalTab, {
                            backgroundColor: on ? '#550a19' : '#fff',
                            borderRightWidth: i < METAL_TABS.length - 1 ? 0.5 : 0,
                          }]}>
                          <Text style={[s.metalTabText, { color: on ? '#fff' : '#550a19' }]}>{tb.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Field>

                <View style={s.row3}>
                  <Field label={lang === 'th' ? 'น้ำหนักทอง (กรัม)' : 'Gold (g)'} s={s} flex>
                    <TextInput dataSet={{ hov: 'field' }} style={s.input} value={j.unit_weight_g}
                      onChangeText={(v) => updJ(j.id, { unit_weight_g: v })} keyboardType="decimal-pad"
                      placeholder="0.00" placeholderTextColor="#c0a0a8" />
                  </Field>
                  <Field label="Ring size" s={s} flex>
                    <TextInput dataSet={{ hov: 'field' }} style={s.input} value={j.ring_size}
                      onChangeText={(v) => updJ(j.id, { ring_size: v })} placeholder="52" placeholderTextColor="#c0a0a8" />
                  </Field>
                  <Field label="Engrave" s={s} flex>
                    <TextInput dataSet={{ hov: 'field' }} style={s.input} value={j.engrave}
                      onChangeText={(v) => updJ(j.id, { engrave: v })} placeholder="ข้อความสลัก" placeholderTextColor="#c0a0a8" />
                  </Field>
                </View>

                {/* เพชรของงานชิ้นนี้ */}
                <Text style={s.subLabel}>{lang === 'th' ? 'เพชร' : 'Diamonds'}</Text>
                {j.stones.map((st, si) => (
                  <View key={st.id} style={s.stoneCard}>
                    <View style={s.stoneHead}>
                      <Text style={s.stoneNo}>{lang === 'th' ? `เม็ดที่ ${si + 1}` : `Stone ${si + 1}`}</Text>
                      {j.stones.length > 1 && (
                        <TouchableOpacity dataSet={{ hov: 'btn' }}
                          onPress={() => updJ(j.id, { stones: j.stones.filter(x => x.id !== st.id) })}>
                          <MaterialCommunityIcons name="close" size={sc(15)} color="#9b7d86" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={s.row3}>
                      <Field label={lang === 'th' ? 'ทรงเพชร' : 'Shape'} s={s} flex>
                        <SelectInput
                          value={st.shape}
                          onChange={(v) => updS(j.id, st.id, { shape: v })}
                          options={SHAPES}
                          placeholder="เลือก..."
                          title="ทรงเพชร"
                          style={[s.input, s.pickBox]}
                        />
                      </Field>
                      <Field label={lang === 'th' ? 'สีเพชร' : 'Colour'} s={s} flex>
                        <SelectInput
                          value={st.color}
                          onChange={(v) => updS(j.id, st.id, { color: v })}
                          options={DIA_COLORS}
                          placeholder="เลือก..."
                          title="สีเพชร"
                          style={[s.input, s.pickBox]}
                        />
                      </Field>
                      <Field label={lang === 'th' ? 'ความสะอาด' : 'Clarity'} s={s} flex>
                        <SelectInput
                          value={st.clarity}
                          onChange={(v) => updS(j.id, st.id, { clarity: v })}
                          options={CLARITY}
                          placeholder="เลือก..."
                          title="ความสะอาด"
                          style={[s.input, s.pickBox]}
                        />
                      </Field>
                    </View>
                    <View style={s.row3}>
                      <Field label={lang === 'th' ? 'กะรัตรวม' : 'Carat'} s={s} flex>
                        <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.carat}
                          onChangeText={(v) => updS(j.id, st.id, { carat: v })} keyboardType="decimal-pad"
                          placeholder="0.00" placeholderTextColor="#c0a0a8" />
                      </Field>
                      <Field label={lang === 'th' ? 'จำนวนเม็ด' : 'Pcs'} s={s} flex>
                        <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.qty}
                          onChangeText={(v) => updS(j.id, st.id, { qty: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad"
                          placeholder="1" placeholderTextColor="#c0a0a8" />
                      </Field>
                      <Field label="Certificate" s={s} flex>
                        <View style={s.chipRow}>
                          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => updS(j.id, st.id, { has_cert: true })}
                            style={[s.tChip, st.has_cert && s.tChipOn]}>
                            <Text style={[s.tChipText, st.has_cert && s.tChipTextOn]}>มี</Text>
                          </TouchableOpacity>
                          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => updS(j.id, st.id, { has_cert: false, cert_no: '' })}
                            style={[s.tChip, !st.has_cert && s.tChipOn]}>
                            <Text style={[s.tChipText, !st.has_cert && s.tChipTextOn]}>ไม่มี</Text>
                          </TouchableOpacity>
                        </View>
                      </Field>
                    </View>
                    {st.has_cert && (
                      <Field label={lang === 'th' ? 'เลขใบเซอร์' : 'Certificate no.'} s={s}>
                        <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.cert_no}
                          onChangeText={(v) => updS(j.id, st.id, { cert_no: v })} placeholder="IGI 2312345678"
                          placeholderTextColor="#c0a0a8" />
                      </Field>
                    )}
                  </View>
                ))}
                <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.addBtn}
                  onPress={() => updJ(j.id, { stones: [...j.stones, newStone()] })}>
                  <MaterialCommunityIcons name="plus" size={sc(14)} color="#550a19" />
                  <Text style={s.addText}>{lang === 'th' ? 'เพิ่มเพชรอีกเม็ด' : 'Add diamond'}</Text>
                </TouchableOpacity>

                <Field label={lang === 'th' ? 'หมายเหตุงานชิ้นนี้' : 'Notes'} s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    value={j.note} onChangeText={(v) => updJ(j.id, { note: v })} multiline
                    placeholder="สิ่งที่ช่างต้องรู้" placeholderTextColor="#c0a0a8" />
                </Field>

                <Text style={s.subLabel}>{lang === 'th' ? `รูป — ${j.photos.length}/4` : `Photos — ${j.photos.length}/4`}</Text>
                <View style={s.photoRow}>
                  {j.photos.map((p, i) => (
                    <View key={i} style={s.photoBox}>
                      <Image source={{ uri: p }} style={s.photoImg} resizeMode="cover" />
                      <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => dropPhoto(j.id, i)} style={s.photoX}>
                        <MaterialCommunityIcons name="close" size={sc(13)} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {j.photos.length < 4 && (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => pickPhoto(j.id)} style={[s.photoBox, s.photoAdd]}>
                      <MaterialCommunityIcons name="image-plus" size={sc(18)} color="#c0a0a8" />
                      <Text style={s.photoAddText}>{lang === 'th' ? 'เพิ่มรูป' : 'Add'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={addJob} style={s.addJobBtn}>
              <MaterialCommunityIcons name="plus" size={sc(16)} color="#550a19" />
              <Text style={s.addJobText}>{lang === 'th' ? 'เพิ่มงานอีกชิ้น' : 'Add another job'}</Text>
            </TouchableOpacity>

            {/* ── การชำระเงิน ── */}
            <Text style={s.grpLabel}>{lang === 'th' ? 'การชำระเงิน' : 'Payments'}</Text>
            {form.payments.map((p, pi) => (
              <View key={p.id} style={s.row3}>
                <Field label={lang === 'th' ? `ครั้งที่ ${pi + 1}` : `Payment ${pi + 1}`} s={s} flex>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={p.amount}
                    onChangeText={(v) => updP(p.id, { amount: v })} keyboardType="numeric"
                    placeholder="0" placeholderTextColor="#c0a0a8" />
                </Field>
                <Field label={lang === 'th' ? 'หมายเหตุ' : 'Note'} s={s} flex>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={p.note}
                    onChangeText={(v) => updP(p.id, { note: v })} placeholder="มัดจำ / โอน"
                    placeholderTextColor="#c0a0a8" />
                </Field>
                {form.payments.length > 1 && (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.payX}
                    onPress={() => setForm(f => ({ ...f, payments: f.payments.filter(x => x.id !== p.id) }))}>
                    <MaterialCommunityIcons name="close" size={sc(15)} color="#9b7d86" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.addBtn}
              onPress={() => setForm(f => ({ ...f, payments: [...f.payments, newPay()] }))}>
              <MaterialCommunityIcons name="plus" size={sc(14)} color="#550a19" />
              <Text style={s.addText}>{lang === 'th' ? 'เพิ่มการชำระ' : 'Add payment'}</Text>
            </TouchableOpacity>

            <View style={s.totalBox}>
              <View style={s.totalLine}>
                <Text style={s.totalLabel}>{lang === 'th' ? 'ยอดรวมทั้งหมด' : 'Grand total'}</Text>
                <Text style={s.totalVal}>฿{fmt(grandTotal)}</Text>
              </View>
              <View style={s.totalLine}>
                <Text style={s.totalLabel}>{lang === 'th' ? 'ชำระแล้ว' : 'Paid'}</Text>
                <Text style={s.totalSub}>฿{fmt(paidTotal)}</Text>
              </View>
              <View style={s.totalLine}>
                <Text style={[s.totalLabel, { fontWeight: '600' }]}>{lang === 'th' ? 'คงเหลือ' : 'Balance'}</Text>
                <Text style={s.totalVal}>฿{fmt(Math.max(0, grandTotal - paidTotal))}</Text>
              </View>
            </View>

            <Field label={lang === 'th' ? 'หมายเหตุใบนี้' : 'Order note'} s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={[s.input, { height: 56, textAlignVertical: 'top' }]}
                value={form.job_note} onChangeText={(v) => upd({ job_note: v })} multiline
                placeholderTextColor="#c0a0a8" />
            </Field>

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => upd({ is_urgent: !form.is_urgent })} style={s.urgentRow}>
              <View style={[s.box, form.is_urgent && s.boxOn]}>
                {form.is_urgent && <MaterialCommunityIcons name="check" size={sc(11)} color="#fff" />}
              </View>
              <Text style={s.urgentText}>{lang === 'th' ? 'งานเร่ง' : 'Urgent'}</Text>
            </TouchableOpacity>

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={save} disabled={saving}
              style={[s.saveBtn, saving && { opacity: 0.7 }]}>
              <Text style={s.saveText}>
                {saving ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                        : form.id ? (lang === 'th' ? 'บันทึกการแก้ไข' : 'Save changes')
                                  : (lang === 'th' ? 'บันทึกใบสั่งทำ' : 'Save order')}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </ShellModal>


      {/* ═══════════ ดูใบ ═══════════ */}
      <ShellModal visible={!!sel} animationType="slide" presentationStyle="pageSheet"
        onClose={() => setSel(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{sel?.customer_name || sel?.work_no}</Text>
            {!!sel && (
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { const o = sel; setSel(null); openEdit(o); }}
                style={s.editBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={sc(13)} color="#550a19" />
                <Text style={s.editText}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            {selBusy && <ActivityIndicator color="#550a19" style={{ marginBottom: 12 }} />}
            {!!sel && (
              <>
                <View style={s.card}>
                  <InfoLine s={s} k="ลูกค้า" v={sel.customer_name || '—'} />
                  <InfoLine s={s} k="เบอร์โทร" v={sel.customer_phone || '—'} />
                  <InfoLine s={s} k="วันที่รับงาน" v={sel.ordered_at ? dateTH(sel.ordered_at) : '—'} />
                  <InfoLine s={s} k="วันที่ส่งงาน" v={sel.due_date ? dateTH(sel.due_date) : '—'} />
                  <InfoLine s={s} k="ยอดรวมทั้งหมด" v={`฿${fmt(sel.grand_total)}`} />
                  <InfoLine s={s} k="ชำระแล้ว" v={`฿${fmt(sel.paid_total)}`} />
                  <InfoLine s={s} k="คงเหลือ" v={`฿${fmt(Math.max(0, num(sel.grand_total) - num(sel.paid_total)))}`} />
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

                {(sel.items || []).map((it, i) => (
                  <View key={it.id} style={s.card}>
                    <Text style={s.secTitle}>{i + 1}. {it.job_type || it.name}</Text>
                    <Text style={s.cardSub}>
                      {[it.job_code, it.metal_type, it.ring_size ? `ไซซ์ ${it.ring_size}` : ''].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={s.itemPrice}>฿{fmt(it.price)}</Text>
                    {it.stocked_product_id ? (
                      <View style={s.doneRow}>
                        <MaterialCommunityIcons name="check-circle" size={sc(14)} color="#2e7d32" />
                        <Text style={s.doneText}>เพิ่มเข้าสต๊อกแล้ว</Text>
                      </View>
                    ) : (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.smallBtn} onPress={() => openStock(it)}>
                        <MaterialCommunityIcons name="tray-arrow-down" size={sc(13)} color="#550a19" />
                        <Text style={s.smallBtnText}>เพิ่มเข้าสต๊อก</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <View style={s.actRow}>
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printWorkOrder(sel)} style={s.actBtn}>
                    <MaterialCommunityIcons name="printer" size={sc(15)} color="#550a19" />
                    <Text style={s.actText}>ปริ้น</Text>
                  </TouchableOpacity>
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => saveWorkOrder(sel)} style={s.actBtn}>
                    <MaterialCommunityIcons name="file-pdf-box" size={sc(15)} color="#550a19" />
                    <Text style={s.actText}>บันทึก PDF</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </ShellModal>

      {/* ═══════════ ยืนยันส่งมอบ ═══════════ */}
      <ShellModal visible={askDeliver} animationType="fade" transparent onRequestClose={() => setAskDeliver(false)}>
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <Text style={s.modalTitle}>ยืนยันส่งมอบงาน</Text>
            <Text style={s.confirmMsg}>
              {sel?.customer_name || sel?.work_no} — รับงานคืนจากช่างเรียบร้อยแล้วใช่ไหม{'\n'}
              ยืนยันแล้วจะถามต่อว่าจะเพิ่มงานเข้าสต๊อกเลยหรือไม่
            </Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setAskDeliver(false)}
                style={[s.confirmBtn, { backgroundColor: '#f9f4f5' }]}>
                <Text style={[s.confirmBtnText, { color: '#806070' }]}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={confirmDeliver} disabled={statusBusy}
                style={[s.confirmBtn, { backgroundColor: '#550a19', opacity: statusBusy ? 0.7 : 1 }]}>
                <Text style={[s.confirmBtnText, { color: '#fff5f7' }]}>{statusBusy ? 'กำลังบันทึก...' : 'ยืนยันส่งมอบ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ShellModal>

      {/* ═══════════ เพิ่มเข้าสต๊อก ═══════════ */}
      <ShellModal visible={!!stockForm} animationType="fade" transparent onRequestClose={() => setStockForm(null)}>
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <Text style={s.modalTitle}>เพิ่มเข้าสต๊อก</Text>
            <Text style={s.cardSub}>{stockForm?.item?.job_type || stockForm?.item?.name}</Text>
            {!!stockForm?.fromDeliver && (
              <Text style={s.confirmMsg}>ส่งมอบแล้ว — จะเพิ่มงานชิ้นนี้เข้าสต๊อกเลยไหม</Text>
            )}
            {!!stockErr && <View style={s.errBox}><Text style={s.errText}>{stockErr}</Text></View>}
            <Field label="รหัสสินค้า (SKU) — รันให้ใหม่ ไม่ใช้รหัสงาน" s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={s.input} value={stockForm?.sku || ''}
                onChangeText={v => setStockForm(f => ({ ...f, sku: v }))}
                autoCapitalize="characters" placeholder="ANAKYN#0001" placeholderTextColor="#c0a0a8" />
            </Field>
            <Field label="ราคาขาย" s={s}>
              <TextInput dataSet={{ hov: 'field' }} style={s.input} value={stockForm?.sale_price || ''}
                onChangeText={v => setStockForm(f => ({ ...f, sale_price: v }))}
                keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
            </Field>
            <View style={s.confirmBtns}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={skipStock}
                style={[s.confirmBtn, { backgroundColor: '#f9f4f5' }]}>
                <Text style={[s.confirmBtnText, { color: '#806070' }]}>
                  {stockForm?.fromDeliver ? 'ไม่เพิ่ม' : 'ยกเลิก'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={sendToStock} disabled={stockBusy}
                style={[s.confirmBtn, { backgroundColor: '#550a19', opacity: stockBusy ? 0.7 : 1 }]}>
                <Text style={[s.confirmBtnText, { color: '#fff5f7' }]}>{stockBusy ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</Text>
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

const baseStyles = {
  content: { padding: 14, paddingBottom: 30 },
  box: { width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: '#d4bcc2', justifyContent: 'center', alignItems: 'center' },
  boxOn: { backgroundColor: '#550a19', borderColor: '#550a19' },

  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: '#e8d5d9', backgroundColor: '#fff' },
  ghostText: { fontSize: 12.5, color: '#550a19', fontWeight: '500' },

  pickBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#f0d3da', borderRadius: 12, padding: 11, marginBottom: 12 },
  pickCount: { flex: 1, minWidth: 100, fontSize: 13, color: '#550a19', fontWeight: '600' },
  pickClear: { paddingVertical: 6, paddingHorizontal: 10 },
  pickClearText: { fontSize: 12.5, color: '#9b7d86' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8d5d9', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 13 },
  pickBtnText: { fontSize: 12.5, color: '#550a19', fontWeight: '500' },

  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e8d5d9', backgroundColor: '#fff', alignSelf: 'flex-start' },
  editText: { fontSize: 12, color: '#550a19', fontWeight: '500' },

  mrow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5edef' },
  cardNo: { fontSize: 12, color: '#9b7d86', letterSpacing: 0.4 },
  cardTitle: { fontSize: 14, color: '#2c1015', fontWeight: '500', marginTop: 1 },
  cardSub: { fontSize: 12, color: '#9b7d86', marginTop: 2 },
  cardAmt: { fontSize: 14, color: '#550a19', fontWeight: '600' },

  modal: { flex: 1, backgroundColor: '#fdfbfb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingRight: 56, borderBottomWidth: 1, borderBottomColor: '#ece0e3', backgroundColor: '#fff' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#550a19' },
  modalBody: { padding: 16, paddingBottom: 40 },

  grpLabel: { fontSize: 11, letterSpacing: 1.4, color: '#9b7d86', fontWeight: '600', marginTop: 18, marginBottom: 10 },
  subLabel: { fontSize: 12, color: '#9b7d86', fontWeight: '600', marginTop: 6, marginBottom: 6 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: '#9b7d86', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: '#2c1015' },
  codeIn: { fontWeight: '600', color: '#550a19', letterSpacing: 0.6 },
  lockBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fdf0f2', borderColor: '#f0d3da' },
  lockText: { fontSize: 13.5, color: '#550a19', fontWeight: '500', flex: 1, minWidth: 0 },

  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  row3: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' },

  jobCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8d5d9', borderRadius: 14, padding: 14, marginTop: 14 },
  jobHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  jobNo: { fontSize: 14, fontWeight: '700', color: '#550a19' },
  addJobBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 11, borderWidth: 1, borderColor: '#e8d5d9', borderStyle: 'dashed', backgroundColor: '#fff', marginTop: 14 },
  addJobText: { fontSize: 14, color: '#550a19', fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 7 },
  tChip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: '#e8d5d9', backgroundColor: '#fff' },
  tChipOn: { backgroundColor: '#550a19', borderColor: '#550a19' },
  tChipText: { fontSize: 12.5, color: '#a07080' },
  tChipTextOn: { color: '#fff5f7' },

  metalTabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#e8d5d9', borderRadius: 10, overflow: 'hidden', marginTop: 7 },
  metalTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRightColor: '#e8d5d9' },
  metalTabText: { fontSize: 13, fontWeight: '600' },

  pickBox: { justifyContent: 'center', minHeight: 42 },
  pickText: { fontSize: 13, color: '#2c1015' },
  pickPh: { color: '#c0a0a8' },
  optRow: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f5edef', borderRadius: 8 },
  optText: { fontSize: 14, color: '#2c1015' },

  stoneCard: { backgroundColor: '#fdfbfb', borderWidth: 1, borderColor: '#f0e4e7', borderRadius: 10, padding: 11, marginBottom: 9 },
  stoneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  stoneNo: { fontSize: 12.5, fontWeight: '600', color: '#8c1b2f' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: '#e8d5d9', backgroundColor: '#fff', marginBottom: 12 },
  addText: { fontSize: 12.5, color: '#550a19', fontWeight: '500' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoBox: { width: 88, height: 88, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: '#ece0e3', backgroundColor: '#fff' },
  photoImg: { width: '100%', height: '100%' },
  photoX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(85,10,25,0.85)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#fdfbfb' },
  photoAddText: { fontSize: 11, color: '#9b7d86' },

  payX: { paddingVertical: 10, paddingHorizontal: 6, marginTop: 20 },

  totalBox: { backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#f0d3da', borderRadius: 12, padding: 14, marginBottom: 12, gap: 6 },
  totalLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  totalLabel: { fontSize: 12.5, color: '#8c1b2f' },
  totalVal: { fontSize: 18, fontWeight: '700', color: '#550a19' },
  totalSub: { fontSize: 14, fontWeight: '600', color: '#8c1b2f' },

  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, marginBottom: 6 },
  urgentText: { fontSize: 13.5, color: '#2c1015' },

  saveBtn: { backgroundColor: '#550a19', borderRadius: 11, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveText: { color: '#fff5f7', fontSize: 15, fontWeight: '600' },

  errBox: { backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#a32d2d' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 12, padding: 14, marginBottom: 12 },
  secTitle: { fontSize: 13.5, fontWeight: '600', color: '#550a19', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#550a19', marginTop: 6, marginBottom: 4 },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f5edef' },
  infoK: { width: 108, fontSize: 12.5, color: '#9b7d86' },
  infoV: { flex: 1, fontSize: 13, color: '#2c1015', minWidth: 0 },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  doneText: { fontSize: 12.5, color: '#2e7d32' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: '#e8d5d9', backgroundColor: '#fff', marginTop: 4 },
  smallBtnText: { fontSize: 12.5, color: '#550a19', fontWeight: '500' },

  actRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  actBtn: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e8d5d9', backgroundColor: '#fff' },
  actText: { fontSize: 13.5, color: '#550a19', fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 },
  confirmMsg: { fontSize: 12.5, color: '#7d5f68', lineHeight: 20, marginTop: 8, marginBottom: 14 },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { fontSize: 13.5, fontWeight: '600' },
};
