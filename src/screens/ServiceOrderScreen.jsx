// ══════════════════════════════════════════════════════
// ServiceOrderScreen.jsx — React Native
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import {
  useWide, Toolbar, SearchBox, Chip, PrimaryButton, Panel,
  TableHead, TableRow, TdNo, TdMain, TdAmt, Pill, Empty,
} from '../components/DataPanel';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printServiceOrder, saveServiceOrder } from '../print';
import { DocWrapper, DocHeader, Parties, Sec, SL, ItemHead, ItemRow, InfoRow, TRow, VatRow, GrandTotal, DocFooter, DocActions, fmtBaht } from '../components/DocLayout';

// ป้ายสถานะ: งานที่ยังค้างอยู่ = แดงอ่อน · งานที่ลูกค้ารับคืนแล้ว = ขาวเส้นบาง
const STATUS_STYLE = {
  received:  { bg: '#fdf0f2', col: '#8c1b2f' },
  repairing: { bg: '#fdf0f2', col: '#8c1b2f' },
  qc:        { bg: '#fdf0f2', col: '#8c1b2f' },
  notified:  { bg: '#fdf0f2', col: '#8c1b2f' },
  picked_up: { bg: '#ffffff', col: '#9b7d86' },
};

const STATUS_LABELS = {
  th: { received: 'รับเรื่อง', repairing: 'กำลังซ่อม', qc: 'ตรวจสอบ', notified: 'แจ้งลูกค้า', picked_up: 'รับคืนแล้ว' },
  en: { received: 'Received', repairing: 'Repairing', qc: 'QC', notified: 'Notified', picked_up: 'Picked up' },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

const FILTERS = [
  { key: 'all',       th: 'ทั้งหมด',    en: 'All' },
  { key: 'open',      th: 'ค้างอยู่',    en: 'Open' },
  { key: 'picked_up', th: 'รับคืนแล้ว', en: 'Picked up' },
];
const TONE = { received: 'attn', repairing: 'attn', qc: 'attn', notified: 'attn', picked_up: 'done' };
const COLS = [
  { label: 'เลขที่', w: 125 },
  { label: 'ลูกค้า', w: 150 },
  { label: 'งานที่รับ' },
  { label: 'สถานะ', w: 105 },
  { label: 'ค่าซ่อม', w: 90, rt: true },
];

export default function ServiceOrderScreen({ navigation }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang]     = useState('th');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selSO, setSelSO]   = useState(null);
  const [dVatOn, setDVatOn]   = useState(false);
  const [dVatRate, setDVatRate] = useState('7');
  const [custName, setCustName]   = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [prodName, setProdName]   = useState('');
  const [issue, setIssue]         = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [dueDate, setDueDate]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [confirmDel, setConfirmDel] = useState(false);  // แตะครั้งแรก = ขอยืนยัน, ครั้งที่สอง = ลบจริง
  const slabs = STATUS_LABELS[lang];

  useEffect(() => {
    api.getServiceOrders().then(setOrders).finally(() => setLoading(false));
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!custName.trim() || !prodName.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกชื่อลูกค้าและสินค้า' : 'Please fill customer and product');
      return;
    }
    setSaving(true); setError('');
    try {
      const so = await api.createServiceOrder({
        customer_name: custName, customer_phone: custPhone,
        product_name: prodName, issue_description: issue,
        estimated_cost: parseFloat(estimatedCost) || 0,
        expected_completion_date: dueDate || null,
      });
      setOrders(prev => [so, ...prev]);
      setShowNew(false);
      setCustName(''); setCustPhone(''); setProdName(''); setIssue(''); setEstimatedCost(''); setDueDate('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateServiceStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      if (selSO?.id === id) setSelSO(prev => ({ ...prev, status }));
    } catch (_) {}
  };

  const handleDelete = async () => {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 4000);  // ไม่ยืนยันใน 4 วิ → รีเซ็ต
      return;
    }
    try {
      await api.deleteServiceOrder(selSO.id);
      setOrders(prev => prev.filter(o => o.id !== selSO.id));
      setSelSO(null);
    } catch (_) {}
    setConfirmDel(false);
  };

  const wide = useWide();
  const openSO = (o) => { setDVatOn(false); setDVatRate('7'); setConfirmDel(false); setSelSO(o); };
  const needle = q.trim().toLowerCase();
  const shown = orders.filter(v => {
    if (filter === 'open' && v.status === 'picked_up') return false;
    if (filter !== 'all' && filter !== 'open' && v.status !== filter) return false;
    if (!needle) return true;
    return `${v.service_no} ${v.customer_name || ''} ${v.product_name || ''}`.toLowerCase().includes(needle);
  });
  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบสั่งซ่อม' : 'Service Order'} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loading} lang={lang} />
      <ScrollView contentContainerStyle={s.content}>
        <Toolbar>
          <SearchBox value={q} onChangeText={setQ}
            placeholder={lang === 'th' ? 'ค้นหาเลขที่งานซ่อม ลูกค้า หรือสินค้า' : 'Search job no., customer or item'} />
          {FILTERS.map(f => (
            <Chip key={f.key} label={lang === 'th' ? f.th : f.en} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <PrimaryButton label={lang === 'th' ? 'รับงานซ่อมใหม่' : 'New service'} onPress={() => setShowNew(true)} />
        </Toolbar>

        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20, marginBottom: 12 }} />}

        <Panel title={lang === 'th' ? 'ใบสั่งซ่อมทั้งหมด' : 'All service orders'}
          right={`${shown.length} ${lang === 'th' ? 'งาน' : 'jobs'}`}>
          {wide && <TableHead cols={COLS} />}
          {!loading && shown.length === 0 && <Empty text={lang === 'th' ? 'ยังไม่มีใบสั่งซ่อม' : 'No service orders yet'} />}
          {shown.map((o, i) => {
            const tone = TONE[o.status] || 'done';
            const label = slabs[o.status] || o.status;
            const last = i === shown.length - 1;
            return wide ? (
              <TableRow key={o.id} cols={COLS} last={last} onPress={() => openSO(o)}
                cells={[
                  <TdNo text={o.service_no} />,
                  <TdMain text={o.customer_name || 'ไม่ระบุ'} />,
                  <TdMain text={o.product_name || '—'} sub={o.issue_description} />,
                  <Pill label={label} tone={tone} />,
                  <TdAmt text={o.estimated_cost > 0 ? `฿${fmt(o.estimated_cost)}` : '—'} />,
                ]} />
            ) : (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={o.id} onPress={() => openSO(o)}
                style={[s.mrow, last && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardNo}>{o.service_no}</Text>
                  <Text style={s.cardTitle}>{o.product_name || '—'}</Text>
                  <Text style={s.cardSub}>{o.customer_name || 'ไม่ระบุ'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {o.estimated_cost > 0 && <Text style={s.cardAmt}>฿{fmt(o.estimated_cost)}</Text>}
                  <Pill label={label} tone={tone} />
                </View>
              </TouchableOpacity>
            );
          })}
        </Panel>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW SO MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'รับงานซ่อมใหม่' : 'New Service Order'}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ชื่อลูกค้า' : 'Customer Name'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={custName} onChangeText={setCustName} placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={custPhone} onChangeText={setCustPhone} keyboardType="phone-pad" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ชื่อสินค้าที่นำมาซ่อม' : 'Product Name'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={prodName} onChangeText={setProdName} placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'อาการเสีย / ปัญหา' : 'Issue Description'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={issue} onChangeText={setIssue} multiline placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ค่าซ่อมประมาณ (บาท)' : 'Estimated Cost (THB)'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={estimatedCost} onChangeText={setEstimatedCost} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'วันนัดรับ (YYYY-MM-DD)' : 'Due Date (YYYY-MM-DD)'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={dueDate} onChangeText={setDueDate} placeholder="2026-01-31" placeholderTextColor="#c0a0a8" />
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleCreate} disabled={saving} style={[s.createBtn, { opacity: saving ? 0.7 : 1, marginTop: 8 }]}>
              {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={sc(18)} color="#fff5f7" />}
              <Text style={s.createBtnText}>{saving ? 'กำลังบันทึก...' : (lang === 'th' ? 'รับงาน' : 'Accept Job')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selSO} animationType="slide" presentationStyle="pageSheet">
        {selSO && (
          <ScrollView style={s.modal} contentContainerStyle={{ paddingTop: 16, paddingBottom: 30 }}>
            {(() => {
              const base = Number(selSO.total_cost ?? selSO.estimated_cost) || 0;
              const rate = parseFloat(dVatRate) || 0;
              const vatAmt = dVatOn ? Math.round(base * rate / 100) : 0;
              const grand = base + vatAmt;
              const docObj = { ...selSO, base_cost: base, vat_amount: vatAmt, grand_total: grand, vat_applied: dVatOn, vat_rate: rate };
              return (
                <>
                  <DocWrapper>
                    <DocHeader badge={lang === 'th' ? 'ใบสั่งซ่อม' : 'SERVICE ORDER'} docNo={selSO.service_no}
                      meta={[
                        ['วันที่รับ', new Date(selSO.received_at || selSO.created_at).toLocaleDateString('th-TH')],
                        ['นัดรับ', selSO.pickup_date ? new Date(selSO.pickup_date).toLocaleDateString('th-TH') : '—'],
                        ['VAT', dVatOn ? `${rate}%` : 'ไม่มี'],
                      ]} />
                    <Parties
                      buyer={{ label: lang === 'th' ? 'ลูกค้า' : 'CUSTOMER', name: selSO.customer_name || 'ไม่ระบุ', sub: selSO.customer_phone || '—' }}
                    />
                    <Sec>
                      <InfoRow label={lang === 'th' ? 'สินค้าที่ซ่อม' : 'Item'} value={selSO.product_name} />
                      {!!selSO.issue_description && <InfoRow label={lang === 'th' ? 'อาการ / ปัญหา' : 'Issue'} value={selSO.issue_description} />}
                    </Sec>
                    <Sec>
                      <SL>{lang === 'th' ? 'รายการซ่อม / บริการ' : 'SERVICES'}</SL>
                      <ItemHead cols={['รายการ', '', 'ค่าบริการ']} />
                      {(selSO.services || []).map((sv, i) => (
                        <ItemRow key={i} name={sv.name || `บริการที่ ${i + 1}`}
                          price={sv.is_warranty ? 0 : sv.price}
                          sub={sv.is_warranty ? (lang === 'th' ? 'ประกัน (ฟรี)' : 'Warranty') : null} />
                      ))}
                      {(selSO.services || []).length === 0 && <Text style={{ fontSize: 11, color: '#a07080' }}>— ไม่มีรายการ —</Text>}
                    </Sec>
                    <Sec>
                      <TRow label={lang === 'th' ? 'ค่าซ่อม' : 'Service cost'} value={fmtBaht(base)} />
                      <VatRow enabled={dVatOn} rate={dVatRate} amount={vatAmt} onToggle={setDVatOn} onRate={setDVatRate} lang={lang} />
                    </Sec>
                    <GrandTotal label={lang === 'th' ? 'ยอดรวมทั้งสิ้น' : 'Grand Total'} value={fmtBaht(grand)} />
                    <DocFooter>ใบสั่งซ่อม · Anakyn Gems Co., Ltd.</DocFooter>
                  </DocWrapper>
                  <Text style={[s.fieldLabel, { marginTop: 16 }]}>{lang === 'th' ? 'อัปเดตสถานะ' : 'Update status'}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {['received','repairing','qc','notified','picked_up'].map(st => {
                      const stStyle = STATUS_STYLE[st];
                      return (
                        <TouchableOpacity dataSet={{ hov: 'btn' }} key={st} onPress={() => handleUpdateStatus(selSO.id, st)}
                          style={[s.stBtn, { backgroundColor: selSO.status === st ? stStyle.col : stStyle.bg, borderColor: stStyle.col }]}>
                          <Text style={[s.stBtnText, { color: selSO.status === st ? '#fff' : stStyle.col }]}>{slabs[st]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <DocActions lang={lang} onPrint={() => printServiceOrder(docObj)} onSavePdf={() => saveServiceOrder(docObj)} onBack={() => setSelSO(null)} />
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleDelete} style={[s.delBtn, confirmDel && s.delBtnConfirm]} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="trash-can-outline" size={sc(16)} color={confirmDel ? '#fff' : '#a32d2d'} />
                    <Text style={[s.delBtnText, confirmDel && { color: '#fff' }]}>
                      {confirmDel
                        ? (lang === 'th' ? 'แตะอีกครั้งเพื่อยืนยันลบ' : 'Tap again to confirm')
                        : (lang === 'th' ? 'ลบใบสั่งซ่อม' : 'Delete')}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </ScrollView>
        )}
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
  mrow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5edef' },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardNo:     { fontSize: 10, fontWeight: '500', color: '#550a19', marginBottom: 1 },
  cardTitle:  { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  cardSub:    { fontSize: 11, color: '#a07080', marginTop: 2 },
  cardAmt:    { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  badge:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2.5, borderWidth: 1, borderColor: '#ece0e3' },
  badgeText:  { fontSize: 9, fontWeight: '500' },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:     { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, padding: 9, fontSize: 13, color: '#2c1015', marginBottom: 10 },
  createBtn:  { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  createBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  stBtn:      { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stBtnText:  { fontSize: 12, fontWeight: '500' },
  delBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e8c0c8', backgroundColor: '#fff' },
  delBtnConfirm: { backgroundColor: '#a32d2d', borderColor: '#a32d2d' },
  delBtnText: { fontSize: 13, fontWeight: '600', color: '#a32d2d' },
};
