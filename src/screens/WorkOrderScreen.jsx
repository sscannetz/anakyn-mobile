// ══════════════════════════════════════════════════════════════
// WorkOrderScreen.jsx — ใบสั่งทำ (Work Order)
//
// คนละเรื่องกับใบสั่งซ่อม: ใบสั่งซ่อม = ของลูกค้าเอามาซ่อม
//                          ใบสั่งทำ   = เราสั่งช่างผลิตใหม่ ส่งทอง+เพชรออกไป แล้วรับเข้าสต๊อก
//
// 1 ใบมีได้หลายรายการ · แต่ละรายการดึงจากสินค้าในสต๊อกได้ หรือกรอกมือก็ได้
// น้ำหนัก "ทองแท้ 100%" คิดให้อัตโนมัติตามกะรัตของโลหะ (ช่างใช้เลขนี้ชั่งตอนรับ-ส่งงาน)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import {
  useWide, Toolbar, SearchBox, Chip, PrimaryButton, Panel,
  TableHead, TableRow, TdNo, TdMain, TdAmt, Pill, Empty,
} from '../components/DataPanel';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printWorkOrder, saveWorkOrder } from '../print';

// ── ความบริสุทธิ์ของทองตามกะรัต — ต้องตรงกับ workOrderController.js ฝั่ง backend ──
const PURITY = { '9K': 9 / 24, '14K': 14 / 24, '18K': 18 / 24, silver: 0 };
const METALS = [
  { key: '9K', label: '9K' }, { key: '14K', label: '14K' },
  { key: '18K', label: '18K' }, { key: 'silver', label: 'เงิน 925' },
];
const COLORS = [
  { key: 'yellow', label: 'ทองคำ' }, { key: 'white', label: 'ทองคำขาว' }, { key: 'pink', label: 'พิ้งค์โกลด์' },
];

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
  { label: 'เลขที่', w: 140 },
  { label: 'ช่าง / โรงงาน', w: 150 },
  { label: 'งานที่สั่ง' },
  { label: 'กำหนดส่ง', w: 110 },
  { label: 'สถานะ', w: 105 },
  { label: 'ทองแท้ 100%', w: 100, rt: true },
];

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => Math.round(num(n)).toLocaleString('th-TH');
const dateTH = (v) => { const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('th-TH'); };

const newStone = () => ({ id: Date.now() + Math.random(), shape: '', size_mm: '', color: '', clarity: '', cert_no: '', qty: '1', carat: '' });
const newItem = () => ({
  id: Date.now() + Math.random(), product_id: null, design_code: '', name: '', photo_url: null,
  metal_type: '18K', metal_color: 'white', unit_weight_g: '', qty: '1', loss_pct: '10', ring_size: '',
  labor_cost: '', plating_cost: '', note: '', stones: [newStone()],
});

// ── ยอดรวมของ 1 รายการ — สูตรเดียวกับ backend เป๊ะ ──
function itemTotals(it) {
  const qty = Math.max(1, parseInt(it.qty, 10) || 1);
  const weight = num(it.unit_weight_g) * qty;
  const stoneG = (it.stones || []).reduce((sum, st) => sum + num(st.carat) * 0.2, 0) * qty;
  const metalG = Math.max(0, weight - stoneG);
  return {
    qty,
    weight_g: weight,
    stone_g: stoneG,
    metal_g: metalG,
    pure_gold_g: metalG * (PURITY[it.metal_type] ?? 0),
    labor_total: (num(it.labor_cost) + num(it.plating_cost)) * qty,
  };
}

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

  // ── ใบใหม่ ──
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [head, setHead] = useState({
    customer_name: '', customer_phone: '', workshop: '', ordered_by: '',
    quotation_ref: '', due_date: '', job_note: '', is_urgent: false,
  });
  const [items, setItems] = useState([newItem()]);

  // ── เลือกสินค้าจากสต๊อก ──
  const [pickFor, setPickFor] = useState(null);   // id ของรายการที่กำลังเลือกให้
  const [stock, setStock]     = useState([]);
  const [stockQ, setStockQ]   = useState('');
  const [pickBusy, setPickBusy] = useState(false);

  // ── ดูใบ ──
  const [sel, setSel]         = useState(null);
  const [selBusy, setSelBusy] = useState(false);
  const [stockForm, setStockForm] = useState(null);  // { item, sku, sale_price }
  const [stockBusy, setStockBusy] = useState(false);
  const [stockErr, setStockErr]   = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { setOrders(await api.getWorkOrders()); } catch (_) { setOrders([]); }
    setLoading(false);
  };

  const upd  = (id, patch) => setItems(list => list.map(it => (it.id === id ? { ...it, ...patch } : it)));
  const updS = (itemId, stoneId, patch) => setItems(list => list.map(it =>
    it.id === itemId ? { ...it, stones: it.stones.map(st => (st.id === stoneId ? { ...st, ...patch } : st)) } : it));

  const grand = useMemo(() => items.reduce((acc, it) => {
    const t = itemTotals(it);
    acc.qty += t.qty; acc.weight += t.weight_g; acc.stone += t.stone_g;
    acc.metal += t.metal_g; acc.pure += t.pure_gold_g; acc.labor += t.labor_total;
    return acc;
  }, { qty: 0, weight: 0, stone: 0, metal: 0, pure: 0, labor: 0 }), [items]);

  // ── เลือกรูปจากเครื่อง (นอกเหนือจากรูปที่ติดมากับสินค้าในสต๊อก) ──
  const pickPhoto = async (itemId) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (r.canceled || !r.assets?.[0]) return;
      const out = await ImageManipulator.manipulateAsync(
        r.assets[0].uri, [{ resize: { width: 600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      upd(itemId, { photo_url: out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri });
    } catch (_) {}
  };

  // ── ดึงสินค้าจากสต๊อกมาเติมให้ทั้งรายการ ──
  const openPicker = async (itemId) => {
    setPickFor(itemId); setStockQ('');
    if (stock.length === 0) {
      setPickBusy(true);
      try { setStock(await api.getProducts({ light: 'true' })); } catch (_) {}
      setPickBusy(false);
    }
  };
  const applyProduct = async (p) => {
    const itemId = pickFor;
    setPickFor(null);
    let full = p;
    try { full = await api.getProduct(p.id); } catch (_) {}
    let ds = full.diamonds;
    if (typeof ds === 'string') { try { ds = JSON.parse(ds); } catch (_) { ds = []; } }
    const stones = (Array.isArray(ds) ? ds : []).filter(d => d && (d.weight || d.qty)).map(d => ({
      id: Date.now() + Math.random(),
      shape: d.shape || '', size_mm: '', color: d.color || '', clarity: d.clarity || '',
      cert_no: d.certNo || '', qty: String(d.qty || 1),
      carat: String(((num(d.weight) * (num(d.qty) || 1)) || 0).toFixed(2)),
    }));
    upd(itemId, {
      product_id: full.id,
      design_code: full.sku || '',
      name: full.name || '',
      photo_url: full.photo_url || null,
      metal_type: METALS.some(m => m.key === full.metal_type) ? full.metal_type : '18K',
      unit_weight_g: full.metal_weight_g ? String(full.metal_weight_g) : '',
      labor_cost: full.labor_cost ? String(full.labor_cost) : '',
      stones: stones.length ? stones : [newStone()],
    });
  };

  const resetNew = () => {
    setHead({ customer_name: '', customer_phone: '', workshop: '', ordered_by: '', quotation_ref: '', due_date: '', job_note: '', is_urgent: false });
    setItems([newItem()]); setError('');
  };

  const submit = async () => {
    const clean = items.filter(it => it.name.trim());
    if (clean.length === 0) { setError('กรุณากรอกชื่องานอย่างน้อย 1 รายการ'); return; }
    if (!head.workshop.trim()) { setError('กรุณาระบุช่าง / โรงงานที่รับงาน'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...head,
        due_date: head.due_date.trim() || null,
        items: clean.map(it => ({
          product_id: it.product_id, design_code: it.design_code.trim() || null,
          name: it.name.trim(), photo_url: it.photo_url,
          metal_type: it.metal_type, metal_color: it.metal_color,
          unit_weight_g: num(it.unit_weight_g) || null,
          qty: Math.max(1, parseInt(it.qty, 10) || 1),
          loss_pct: num(it.loss_pct), ring_size: it.ring_size.trim() || null,
          labor_cost: num(it.labor_cost), plating_cost: num(it.plating_cost),
          note: it.note.trim() || null,
          stones: (it.stones || []).filter(st => st.carat || st.shape).map(st => ({
            shape: st.shape, size_mm: st.size_mm, color: st.color, clarity: st.clarity,
            cert_no: st.cert_no, qty: parseInt(st.qty, 10) || 1, carat: num(st.carat),
          })),
        })),
      };
      const created = await api.createWorkOrder(payload);
      setOrders(prev => [created, ...prev]);
      setShowNew(false); resetNew();
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

  const changeStatus = async (status) => {
    if (!sel) return;
    try {
      const updated = await api.updateWorkOrderStatus(sel.id, status);
      setSel(cur => ({ ...cur, ...updated }));
      setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch (_) {}
  };

  const sendToStock = async () => {
    if (!stockForm) return;
    setStockBusy(true); setStockErr('');
    try {
      const r = await api.workItemToStock(sel.id, stockForm.item.id, {
        sku: stockForm.sku.trim(), sale_price: num(stockForm.sale_price),
      });
      setSel(cur => ({
        ...cur,
        items: cur.items.map(i => (i.id === stockForm.item.id ? { ...i, stocked_product_id: r.product?.id || i.stocked_product_id } : i)),
      }));
      setStockForm(null);
    } catch (e) {
      setStockErr(e.message || 'เพิ่มเข้าสต๊อกไม่สำเร็จ');
    }
    setStockBusy(false);
  };

  const needle = q.trim().toLowerCase();
  const shown = orders.filter(o => {
    if (filter === 'open' && o.status === 'delivered') return false;
    if (filter === 'delivered' && o.status !== 'delivered') return false;
    if (!needle) return true;
    return `${o.work_no} ${o.workshop || ''} ${o.customer_name || ''}`.toLowerCase().includes(needle);
  });
  const stockShown = stock.filter(p => {
    const k = stockQ.trim().toLowerCase();
    if (!k) return true;
    return `${p.name || ''} ${p.sku || ''}`.toLowerCase().includes(k);
  });
  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบสั่งทำ' : 'Work Order'} subtitle={headDate}
        onBack={() => navigation.goBack()} lang={lang}
        onLangToggle={() => setLang(l => (l === 'th' ? 'en' : 'th'))} />
      <ConnectingBar visible={loading} lang={lang} />

      <ScrollView contentContainerStyle={s.content}>
        <Toolbar>
          <SearchBox value={q} onChangeText={setQ}
            placeholder={lang === 'th' ? 'ค้นหาเลขที่ใบสั่งทำ ช่าง หรือลูกค้า' : 'Search job no., workshop or customer'} />
          {FILTERS.map(f => (
            <Chip key={f.key} label={lang === 'th' ? f.th : f.en} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <PrimaryButton label={lang === 'th' ? 'เปิดใบสั่งทำใหม่' : 'New work order'} onPress={() => setShowNew(true)} />
        </Toolbar>

        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20, marginBottom: 12 }} />}

        <Panel title={lang === 'th' ? 'ใบสั่งทำทั้งหมด' : 'All work orders'}
          right={`${shown.length} ${lang === 'th' ? 'ใบ' : 'orders'}`}>
          {wide && <TableHead cols={COLS} />}
          {!loading && shown.length === 0 && <Empty text={lang === 'th' ? 'ยังไม่มีใบสั่งทำ' : 'No work orders yet'} />}
          {shown.map((o, i) => {
            const last = i === shown.length - 1;
            const label = slabs[o.status] || o.status;
            return wide ? (
              <TableRow key={o.id} cols={COLS} last={last} onPress={() => openOrder(o)} cells={[
                <TdNo text={o.work_no} />,
                <TdMain text={o.workshop || '—'} />,
                <TdMain text={`${o.item_count || 0} ${lang === 'th' ? 'รายการ' : 'items'} · ${o.total_qty || 0} ${lang === 'th' ? 'ชิ้น' : 'pcs'}`}
                  sub={o.customer_name || undefined} />,
                <TdMain text={o.due_date ? dateTH(o.due_date) : '—'} />,
                <Pill label={label} tone={TONE[o.status] || 'done'} />,
                <TdAmt text={`${num(o.total_pure_gold_g).toFixed(2)} ก.`} />,
              ]} />
            ) : (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={o.id} onPress={() => openOrder(o)}
                style={[s.mrow, last && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardNo}>{o.work_no}</Text>
                  <Text style={s.cardTitle}>{o.workshop || '—'}</Text>
                  <Text style={s.cardSub}>
                    {o.item_count || 0} รายการ · {o.total_qty || 0} ชิ้น
                    {o.due_date ? ` · ส่ง ${dateTH(o.due_date)}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.cardAmt}>{num(o.total_pure_gold_g).toFixed(2)} ก.</Text>
                  <Pill label={label} tone={TONE[o.status] || 'done'} />
                </View>
              </TouchableOpacity>
            );
          })}
        </Panel>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ═══════════ ใบใหม่ ═══════════ */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'เปิดใบสั่งทำใหม่' : 'New Work Order'}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}

            {/* หัวใบ */}
            <View style={s.card}>
              <Text style={s.secTitle}>ข้อมูลใบสั่งทำ</Text>
              <View style={s.row2}>
                <Field label="ช่าง / โรงงาน *" s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.workshop}
                    onChangeText={v => setHead(h => ({ ...h, workshop: v }))} placeholder="เช่น ช่างเอก บ้านหม้อ" placeholderTextColor="#c0a0a8" />
                </Field>
                <Field label="กำหนดส่ง (ปปปป-ดด-วว)" s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.due_date}
                    onChangeText={v => setHead(h => ({ ...h, due_date: v }))} placeholder="2026-10-12" placeholderTextColor="#c0a0a8" />
                </Field>
              </View>
              <View style={s.row2}>
                <Field label="ลูกค้า" s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.customer_name}
                    onChangeText={v => setHead(h => ({ ...h, customer_name: v }))} placeholderTextColor="#c0a0a8" />
                </Field>
                <Field label="เบอร์โทรลูกค้า" s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.customer_phone}
                    onChangeText={v => setHead(h => ({ ...h, customer_phone: v }))} keyboardType="phone-pad" placeholderTextColor="#c0a0a8" />
                </Field>
              </View>
              <View style={s.row2}>
                <Field label="ผู้สั่งทำ" s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.ordered_by}
                    onChangeText={v => setHead(h => ({ ...h, ordered_by: v }))} placeholderTextColor="#c0a0a8" />
                </Field>
                <Field label="อ้างอิงใบเสนอราคา" s={s}>
                  <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.quotation_ref}
                    onChangeText={v => setHead(h => ({ ...h, quotation_ref: v }))} placeholderTextColor="#c0a0a8" />
                </Field>
              </View>
              <Field label="หมายเหตุงาน" s={s}>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={head.job_note}
                  onChangeText={v => setHead(h => ({ ...h, job_note: v }))} placeholderTextColor="#c0a0a8" />
              </Field>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setHead(h => ({ ...h, is_urgent: !h.is_urgent }))}
                style={s.checkRow}>
                <View style={[s.check, head.is_urgent && s.checkOn]}>
                  {head.is_urgent && <MaterialCommunityIcons name="check" size={sc(12)} color="#fff" />}
                </View>
                <Text style={s.checkLabel}>งานเร่ง</Text>
              </TouchableOpacity>
            </View>

            {/* รายการงาน */}
            {items.map((it, idx) => {
              const t = itemTotals(it);
              return (
                <View key={it.id} style={s.card}>
                  <View style={s.itemHead}>
                    <Text style={s.secTitle}>รายการที่ {idx + 1}</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => openPicker(it.id)} style={s.smallBtn}>
                      <MaterialCommunityIcons name="diamond-stone" size={sc(13)} color="#550a19" />
                      <Text style={s.smallBtnText}>ดึงจากสต๊อก</Text>
                    </TouchableOpacity>
                    {items.length > 1 && (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setItems(l => l.filter(x => x.id !== it.id))} style={s.delBtn}>
                        <MaterialCommunityIcons name="close" size={sc(13)} color="#a32d2d" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={s.row2}>
                    <Field label="รหัส / แบบ" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.design_code}
                        onChangeText={v => upd(it.id, { design_code: v })} placeholderTextColor="#c0a0a8" />
                    </Field>
                    <Field label="ชื่องาน *" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.name}
                        onChangeText={v => upd(it.id, { name: v })} placeholder="เช่น แหวนเพชร Oval Solitaire" placeholderTextColor="#c0a0a8" />
                    </Field>
                  </View>

                  {/* รูป */}
                  <View style={s.photoRow}>
                    {it.photo_url
                      ? <Image source={{ uri: it.photo_url }} style={s.photo} resizeMode="cover" />
                      : <View style={[s.photo, s.photoEmpty]}>
                          <MaterialCommunityIcons name="image-outline" size={sc(20)} color="#c8a0b0" />
                        </View>}
                    <View style={{ flex: 1, gap: 6 }}>
                      <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => pickPhoto(it.id)} style={s.smallBtn}>
                        <MaterialCommunityIcons name="upload" size={sc(13)} color="#550a19" />
                        <Text style={s.smallBtnText}>เลือกรูปจากเครื่อง</Text>
                      </TouchableOpacity>
                      {!!it.photo_url && (
                        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => upd(it.id, { photo_url: null })} style={s.smallBtn}>
                          <MaterialCommunityIcons name="trash-can-outline" size={sc(13)} color="#a32d2d" />
                          <Text style={[s.smallBtnText, { color: '#a32d2d' }]}>ลบรูป</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* โลหะ */}
                  <Text style={s.fieldLabel}>โลหะ</Text>
                  <View style={s.chipRow}>
                    {METALS.map(m => (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} key={m.key} onPress={() => upd(it.id, { metal_type: m.key })}
                        style={[s.tChip, it.metal_type === m.key && s.tChipOn]}>
                        <Text style={[s.tChipText, it.metal_type === m.key && s.tChipTextOn]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.chipRow}>
                    {COLORS.map(c => (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} key={c.key} onPress={() => upd(it.id, { metal_color: c.key })}
                        style={[s.tChip, it.metal_color === c.key && s.tChipOn]}>
                        <Text style={[s.tChipText, it.metal_color === c.key && s.tChipTextOn]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={s.row3}>
                    <Field label="น้ำหนัก / ชิ้น (ก.)" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.unit_weight_g}
                        onChangeText={v => upd(it.id, { unit_weight_g: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#c0a0a8" />
                    </Field>
                    <Field label="จำนวน (ชิ้น)" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.qty}
                        onChangeText={v => upd(it.id, { qty: v })} keyboardType="number-pad" />
                    </Field>
                    <Field label="ไซซ์" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.ring_size}
                        onChangeText={v => upd(it.id, { ring_size: v })} placeholderTextColor="#c0a0a8" />
                    </Field>
                  </View>

                  <View style={s.row3}>
                    <Field label="ค่าแรง / ชิ้น" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.labor_cost}
                        onChangeText={v => upd(it.id, { labor_cost: v })} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
                    </Field>
                    <Field label="ค่าชุบ / ชิ้น" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.plating_cost}
                        onChangeText={v => upd(it.id, { plating_cost: v })} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
                    </Field>
                    <Field label="เผื่อสูญเสีย (%)" s={s}>
                      <TextInput dataSet={{ hov: 'field' }} style={s.input} value={it.loss_pct}
                        onChangeText={v => upd(it.id, { loss_pct: v })} keyboardType="numeric" />
                    </Field>
                  </View>

                  <Field label="หมายเหตุช่าง" s={s}>
                    <TextInput dataSet={{ hov: 'field' }} style={[s.input, { minHeight: 56 }]} value={it.note}
                      onChangeText={v => upd(it.id, { note: v })} multiline
                      placeholder="สิ่งที่ช่างต้องรู้ ผิดแล้วต้องทำใหม่ทั้งชิ้น" placeholderTextColor="#c0a0a8" />
                  </Field>

                  {/* เพชร */}
                  <Text style={s.fieldLabel}>เพชร</Text>
                  {it.stones.map((st, si) => (
                    <View key={st.id} style={s.stoneBox}>
                      <View style={s.itemHead}>
                        <Text style={s.stoneTitle}>เม็ดที่ {si + 1}</Text>
                        <View style={{ flex: 1 }} />
                        {it.stones.length > 1 && (
                          <TouchableOpacity dataSet={{ hov: 'btn' }}
                            onPress={() => upd(it.id, { stones: it.stones.filter(x => x.id !== st.id) })} style={s.delBtn}>
                            <MaterialCommunityIcons name="close" size={sc(11)} color="#a32d2d" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={s.row3}>
                        <Field label="ทรง" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.shape}
                            onChangeText={v => updS(it.id, st.id, { shape: v })} placeholder="Oval" placeholderTextColor="#c0a0a8" />
                        </Field>
                        <Field label="ขนาด (มม.)" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.size_mm}
                            onChangeText={v => updS(it.id, st.id, { size_mm: v })} placeholder="11.0 × 8.0" placeholderTextColor="#c0a0a8" />
                        </Field>
                        <Field label="เลขใบเซอร์" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.cert_no}
                            onChangeText={v => updS(it.id, st.id, { cert_no: v })} placeholderTextColor="#c0a0a8" />
                        </Field>
                      </View>
                      <View style={s.row4}>
                        <Field label="สี" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.color}
                            onChangeText={v => updS(it.id, st.id, { color: v })} placeholder="E" placeholderTextColor="#c0a0a8" />
                        </Field>
                        <Field label="ความสะอาด" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.clarity}
                            onChangeText={v => updS(it.id, st.id, { clarity: v })} placeholder="VS1" placeholderTextColor="#c0a0a8" />
                        </Field>
                        <Field label="จำนวนเม็ด" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.qty}
                            onChangeText={v => updS(it.id, st.id, { qty: v })} keyboardType="number-pad" />
                        </Field>
                        <Field label="กะรัตรวม" s={s}>
                          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={st.carat}
                            onChangeText={v => updS(it.id, st.id, { carat: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#c0a0a8" />
                        </Field>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity dataSet={{ hov: 'btn' }}
                    onPress={() => upd(it.id, { stones: [...it.stones, newStone()] })} style={s.addLine}>
                    <MaterialCommunityIcons name="plus" size={sc(13)} color="#550a19" />
                    <Text style={s.addLineText}>เพิ่มเพชรอีกเม็ด</Text>
                  </TouchableOpacity>

                  {/* สรุปรายการ */}
                  <View style={s.sumRow}>
                    <Text style={s.sumText}>น้ำหนักรวม <Text style={s.sumB}>{t.weight_g.toFixed(2)} ก.</Text></Text>
                    <Text style={s.sumText}>เพชร <Text style={s.sumB}>{t.stone_g.toFixed(2)} ก.</Text></Text>
                    <Text style={s.sumText}>โลหะ <Text style={s.sumB}>{t.metal_g.toFixed(2)} ก.</Text></Text>
                    <Text style={s.sumText}>ทองแท้ 100% <Text style={[s.sumB, { color: '#550a19' }]}>{t.pure_gold_g.toFixed(2)} ก.</Text></Text>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setItems(l => [...l, newItem()])} style={s.addItem}>
              <MaterialCommunityIcons name="plus" size={sc(15)} color="#550a19" />
              <Text style={s.addItemText}>เพิ่มรายการงาน</Text>
            </TouchableOpacity>

            {/* รวมทั้งใบ */}
            <View style={s.grandBox}>
              <View style={s.sumRow}>
                <Text style={s.sumText}>รวมจำนวน <Text style={s.sumB}>{grand.qty} ชิ้น</Text></Text>
                <Text style={s.sumText}>น้ำหนักรวม <Text style={s.sumB}>{grand.weight.toFixed(2)} ก.</Text></Text>
                <Text style={s.sumText}>เพชร <Text style={s.sumB}>{grand.stone.toFixed(2)} ก.</Text></Text>
              </View>
              <View style={s.sumRow}>
                <Text style={s.sumText}>ค่าแรง + ชุบ <Text style={s.sumB}>฿{fmt(grand.labor)}</Text></Text>
                <Text style={s.sumText}>รวมทองแท้ 100% <Text style={[s.sumB, { color: '#550a19' }]}>{grand.pure.toFixed(2)} ก.</Text></Text>
              </View>
            </View>

            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={submit} disabled={saving}
              style={[s.saveBtn, { opacity: saving ? 0.7 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff5f7" size="small" />
                : <MaterialCommunityIcons name="check" size={sc(18)} color="#fff5f7" />}
              <Text style={s.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึกใบสั่งทำ'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ═══════════ เลือกสินค้าจากสต๊อก ═══════════ */}
      <Modal visible={!!pickFor} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickFor(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>เลือกจากสต๊อก</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setPickFor(null)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={stockQ} onChangeText={setStockQ}
            placeholder="ค้นหาชื่อสินค้า / SKU" placeholderTextColor="#c0a0a8" />
          {pickBusy && <ActivityIndicator color="#550a19" style={{ marginTop: 16 }} />}
          <ScrollView style={{ marginTop: 10 }}>
            {stockShown.map(p => (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={p.id} onPress={() => applyProduct(p)} style={s.pickRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.cardSub}>{p.sku}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={sc(18)} color="#c0a0a8" />
              </TouchableOpacity>
            ))}
            {!pickBusy && stockShown.length === 0 && <Empty text="ไม่พบสินค้า" />}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ═══════════ ดูใบสั่งทำ ═══════════ */}
      <Modal visible={!!sel} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSel(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{sel?.work_no || 'ใบสั่งทำ'}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setSel(null)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>

          {selBusy && <ActivityIndicator color="#550a19" style={{ marginTop: 16 }} />}

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {!!sel && (
              <>
                <View style={s.card}>
                  <InfoLine s={s} k="ช่าง / โรงงาน" v={sel.workshop || '—'} />
                  <InfoLine s={s} k="ลูกค้า" v={sel.customer_name || '—'} />
                  <InfoLine s={s} k="วันที่สั่ง" v={dateTH(sel.ordered_at || sel.created_at)} />
                  <InfoLine s={s} k="กำหนดส่ง" v={sel.due_date ? dateTH(sel.due_date) : '—'} />
                  {!!sel.job_note && <InfoLine s={s} k="หมายเหตุงาน" v={sel.job_note} />}
                  <InfoLine s={s} k="รวมทองแท้ 100%" v={`${num(sel.total_pure_gold_g).toFixed(2)} กรัม`} />
                  <InfoLine s={s} k="รวมค่าแรง + ชุบ" v={`฿${fmt(sel.total_labor_cost)}`} />
                </View>

                <View style={s.card}>
                  <Text style={s.secTitle}>สถานะ</Text>
                  <View style={s.chipRow}>
                    {STATUSES.map(st => (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} key={st} onPress={() => changeStatus(st)}
                        style={[s.tChip, sel.status === st && s.tChipOn]}>
                        <Text style={[s.tChipText, sel.status === st && s.tChipTextOn]}>{slabs[st]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {(sel.items || []).map((it, i) => (
                  <View key={it.id} style={s.card}>
                    <Text style={s.secTitle}>{i + 1}. {it.name}</Text>
                    <Text style={s.cardSub}>
                      {[it.design_code, it.metal_type, it.ring_size ? `ไซซ์ ${it.ring_size}` : ''].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={s.sumRow}>
                      <Text style={s.sumText}>จำนวน <Text style={s.sumB}>{it.qty} ชิ้น</Text></Text>
                      <Text style={s.sumText}>น้ำหนักรวม <Text style={s.sumB}>{num(it.totals?.weight_g).toFixed(2)} ก.</Text></Text>
                      <Text style={s.sumText}>ทองแท้ <Text style={[s.sumB, { color: '#550a19' }]}>{num(it.totals?.pure_gold_g).toFixed(2)} ก.</Text></Text>
                    </View>
                    {!!it.note && <Text style={s.noteText}>{it.note}</Text>}

                    {it.stocked_product_id ? (
                      <View style={s.doneRow}>
                        <MaterialCommunityIcons name="check-circle" size={sc(14)} color="#2e7d32" />
                        <Text style={s.doneText}>เพิ่มเข้าสต๊อกแล้ว</Text>
                      </View>
                    ) : (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.smallBtn}
                        onPress={() => { setStockErr(''); setStockForm({ item: it, sku: it.design_code || '', sale_price: '' }); }}>
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
      </Modal>

      {/* ═══════════ เพิ่มเข้าสต๊อก ═══════════ */}
      <Modal visible={!!stockForm} animationType="fade" transparent onRequestClose={() => setStockForm(null)}>
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <Text style={s.modalTitle}>เพิ่มเข้าสต๊อก</Text>
            <Text style={s.cardSub}>{stockForm?.item?.name}</Text>
            {!!stockErr && <View style={s.errBox}><Text style={s.errText}>{stockErr}</Text></View>}
            <Field label="รหัสสินค้า (SKU) *" s={s}>
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
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setStockForm(null)}
                style={[s.confirmBtn, { backgroundColor: '#f9f4f5' }]}>
                <Text style={[s.confirmBtnText, { color: '#806070' }]}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={sendToStock} disabled={stockBusy}
                style={[s.confirmBtn, { backgroundColor: '#550a19', opacity: stockBusy ? 0.7 : 1 }]}>
                <Text style={[s.confirmBtnText, { color: '#fff5f7' }]}>{stockBusy ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, children, s }) {
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>{children}</View>;
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
  modal: { flex: 1, backgroundColor: '#fdfbfb', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#550a19' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13, marginBottom: 10 },
  secTitle: { fontSize: 12, fontWeight: '600', color: '#550a19', marginBottom: 8 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },

  field: { flex: 1, marginBottom: 8 },
  fieldLabel: { fontSize: 11, color: '#9b7d86', marginBottom: 3 },
  input: { backgroundColor: '#fdfbfb', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 8, padding: 9, fontSize: 13, color: '#2c1015' },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  row3: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  row4: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  check: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#d4bcc2', justifyContent: 'center', alignItems: 'center' },
  checkOn: { backgroundColor: '#550a19', borderColor: '#550a19' },
  checkLabel: { fontSize: 12.5, color: '#2c1015' },

  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tChip: { borderWidth: 1, borderColor: '#ece0e3', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tChipOn: { backgroundColor: '#550a19', borderColor: '#550a19' },
  tChipText: { fontSize: 11.5, color: '#2c1015' },
  tChipTextOn: { color: '#fff5f7', fontWeight: '600' },

  photoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  photo: { width: 74, height: 74, borderRadius: 8, borderWidth: 1, borderColor: '#ece0e3' },
  photoEmpty: { backgroundColor: '#fdf0f2', justifyContent: 'center', alignItems: 'center' },

  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ece0e3', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { fontSize: 11.5, color: '#550a19', fontWeight: '600' },
  delBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#e8c0c8', justifyContent: 'center', alignItems: 'center' },

  stoneBox: { backgroundColor: '#fdfbfb', borderRadius: 10, borderWidth: 1, borderColor: '#f0e4e7', padding: 10, marginBottom: 8 },
  stoneTitle: { fontSize: 10.5, fontWeight: '600', color: '#8c1b2f', letterSpacing: 0.5 },
  addLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ece0e3', borderRadius: 10, paddingVertical: 9, backgroundColor: '#fdfbfb' },
  addLineText: { fontSize: 12, color: '#550a19' },
  addItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4bcc2', borderRadius: 12, paddingVertical: 12, marginBottom: 10, backgroundColor: '#fff' },
  addItemText: { fontSize: 13, fontWeight: '600', color: '#550a19' },

  sumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, rowGap: 4, justifyContent: 'space-between', backgroundColor: '#fdf0f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  sumText: { fontSize: 11, color: '#9b7d86' },
  sumB: { fontWeight: '700', color: '#2c1015' },
  grandBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#550a19', padding: 10, marginBottom: 12 },

  saveBtn: { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff5f7' },

  errBox: { backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#a32d2d' },

  mrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5edef' },
  cardNo: { fontSize: 11.5, fontWeight: '700', color: '#550a19' },
  cardTitle: { fontSize: 12.5, color: '#2c1015', marginTop: 1 },
  cardSub: { fontSize: 10.5, color: '#9b7d86', marginTop: 1 },
  cardAmt: { fontSize: 12.5, fontWeight: '700', color: '#2c1015' },

  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5edef' },

  infoLine: { flexDirection: 'row', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f5edef' },
  infoK: { width: 130, fontSize: 11.5, color: '#9b7d86' },
  infoV: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#2c1015' },
  noteText: { fontSize: 11.5, color: '#a32d2d', marginTop: 6, lineHeight: 18 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  doneText: { fontSize: 11.5, color: '#2e7d32', fontWeight: '600' },

  actRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#ece0e3', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11 },
  actText: { fontSize: 12.5, fontWeight: '600', color: '#550a19' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { fontSize: 13, fontWeight: '600' },
};
