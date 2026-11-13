// ══════════════════════════════════════════════════════
// ReceiptScreen.jsx — ใบเสร็จรับเงิน (ออกจากรายการขาย)
// ══════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal,
} from 'react-native';
import ShellModal from '../components/ShellModal';
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
import { printReceipt, saveReceipt } from '../print';
import { DocWrapper, DocHeader, Parties, Sec, SL, ItemHead, ItemRow, TRow, GrandTotal, DocFooter, DocActions, fmtBaht } from '../components/DocLayout';

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

const PAY_OPTIONS = [
  { key: 'cash',     th: 'เงินสด',     en: 'Cash' },
  { key: 'transfer', th: 'โอนเงิน',    en: 'Transfer' },
  { key: 'card',     th: 'บัตรเครดิต', en: 'Card' },
  { key: 'other',    th: 'อื่นๆ',      en: 'Other' },
];
const payLabel = (key, lang) => {
  const o = PAY_OPTIONS.find(p => p.key === key);
  return o ? (lang === 'th' ? o.th : o.en) : (key || '—');
};

// วันที่ของใบเสร็จตามเวลาไทย → 'YYYY-MM-DD' (ใช้ในช่องแก้วันที่)
const toYmd = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
};
const n0 = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

const FILTERS = [
  { key: 'all', th: 'ทั้งหมด', en: 'All' },
];
const TONE = {};
const COLS = [
  { label: 'เลขที่', w: 125 },
  { label: 'บิลที่อ้างถึง', w: 125 },
  { label: 'ลูกค้า' },
  { label: 'ช่องทาง', w: 105 },
  { label: 'วันที่', w: 95 },
  { label: 'ยอด', w: 95, rt: true },
];

export default function ReceiptScreen({ navigation, route }) {
  const { styles: s, sc, center, t: th } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang]         = useState('th');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [receipts, setReceipts] = useState([]);
  const [sales, setSales]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [selSaleId, setSelSaleId] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [note, setNote]         = useState('');
  const [issuing, setIssuing]   = useState(false);
  const [error, setError]       = useState('');
  const [selRc, setSelRc]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  // ── แก้ไขใบเสร็จ ──
  const [edit, setEdit]         = useState(null);   // null = ปิด · object = ฟอร์มที่กำลังแก้
  const [editErr, setEditErr]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [stockList, setStockList] = useState(null); // null = ยังไม่โหลด
  const [addQ, setAddQ]         = useState('');

  useEffect(() => {
    api.getReceipts().then(setReceipts).finally(() => setLoading(false));
    api.getSales().then(setSales).catch(() => {});
  }, []);

  // มาจากหน้าบันทึกขาย (ออกใบเสร็จอัตโนมัติ) → เปิดใบเสร็จนั้นทันทีเพื่อสั่งปริ้น
  useEffect(() => {
    const id = route?.params?.openReceiptId;
    if (!id) return;
    api.getReceipts().then(setReceipts).catch(() => {});
    api.getReceipt(id).then(rc => { setConfirmDel(false); setSelRc(rc); }).catch(() => {});
    navigation.setParams({ openReceiptId: undefined });
  }, [route?.params?.openReceiptId]);

  const handleIssue = async () => {
    if (!selSaleId) { setError(lang === 'th' ? 'กรุณาเลือกรายการขาย' : 'Please select a sale'); return; }
    setIssuing(true); setError('');
    try {
      const rc = await api.createReceipt({ sale_id: selSaleId, payment_method: payMethod, note });
      setReceipts(prev => [rc, ...prev]);
      setShowNew(false); setSelSaleId(null); setNote('');
    } catch (err) { setError(err.message || 'ไม่สามารถออกใบเสร็จได้'); }
    finally { setIssuing(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 4000);
      return;
    }
    try {
      await api.deleteReceipt(selRc.id);
      setReceipts(prev => prev.filter(r => r.id !== selRc.id));
      setSelRc(null);
    } catch (_) {}
    setConfirmDel(false);
  };

  // ── แก้ไขใบเสร็จ ──
  const openEdit = () => {
    const rc = selRc;
    // ต้องรอรายละเอียดเต็ม (มีรายการสินค้า) โหลดเสร็จก่อน ไม่งั้นฟอร์มจะเริ่มจากรายการว่าง
    if (!rc || !Array.isArray(rc.items)) return;
    const items = (rc.items || []).map(it => ({
      product_id: it.product_id, name: it.product_name || it.name || '', sku: it.sku || '',
      qty: String(n0(it.qty) || 1), unit_price: String(n0(it.unit_price)),
    }));
    // ยอดรับเดิมเท่ากับยอดบิล → ให้ยอดรับตามยอดบิลใหม่อัตโนมัติ (จนกว่าจะพิมพ์แก้เอง)
    const follow = Math.round(n0(rc.amount) * 100) === Math.round(n0(rc.sale_total ?? rc.total) * 100);
    const form = {
      issued_at: toYmd(rc.issued_at), payment_method: rc.payment_method || 'cash', note: rc.note || '',
      customer_name: rc.customer_name || '', customer_phone: rc.phone || '',
      vip_discount: String(n0(rc.vip_discount)), extra_discount: String(n0(rc.extra_discount)),
      amount: String(n0(rc.amount)), followTotal: follow, items,
    };
    setEdit({ ...form, orig: JSON.parse(JSON.stringify(form)) });
    setEditErr(''); setAddQ('');
    if (!stockList) api.getProducts({ light: 'true' }).then(setStockList).catch(() => setStockList([]));
  };
  const setE = (patch) => setEdit(prev => ({ ...prev, ...patch }));
  const setItem = (i, patch) => setEdit(prev => ({ ...prev, items: prev.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));
  const removeItem = (i) => setEdit(prev => ({ ...prev, items: prev.items.filter((_, k) => k !== i) }));
  const addItem = (p) => {
    setEdit(prev => ({ ...prev, items: [...prev.items, {
      product_id: p.id, name: p.name || '', sku: p.sku || '', qty: '1', unit_price: String(n0(p.sale_price)),
    }] }));
    setAddQ('');
  };
  const addResults = useMemo(() => {
    const qq = addQ.trim().toLowerCase();
    if (!stockList || !qq) return [];
    return stockList.filter(p => [p.sku, p.name].some(v => String(v || '').toLowerCase().includes(qq))).slice(0, 8);
  }, [stockList, addQ]);
  // ยอดบิลใหม่ (สูตรเดียวกับ backend: ส่วนลดก่อน แล้วค่อยคิด VAT 7% ถ้าบิลนี้มี VAT)
  const editTotal = useMemo(() => {
    if (!edit) return 0;
    const sub = edit.items.reduce((a, it) => a + n0(it.qty) * n0(it.unit_price), 0);
    const after = sub - n0(edit.vip_discount) - n0(edit.extra_discount);
    return after + (selRc?.vat_enabled === false ? 0 : Math.round(after * 0.07));
  }, [edit, selRc]);
  const editAmount = edit ? (edit.followTotal ? String(editTotal) : edit.amount) : '';

  const handleSaveEdit = async () => {
    const e = edit, o = e.orig, L = (a, b) => (lang === 'th' ? a : b);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.issued_at) || isNaN(new Date(e.issued_at))) { setEditErr(L('วันที่ไม่ถูกต้อง (ปปปป-ดด-วว เช่น 2026-11-13)', 'Invalid date (YYYY-MM-DD)')); return; }
    if (e.items.length === 0) { setEditErr(L('ต้องมีสินค้าอย่างน้อย 1 รายการ', 'At least 1 item required')); return; }
    if (e.items.some(it => !/^\d+$/.test(String(it.qty).trim()) || Number(it.qty) < 1)) { setEditErr(L('จำนวนสินค้าต้องเป็นเลขเต็มตั้งแต่ 1 ขึ้นไป', 'Qty must be a whole number ≥ 1')); return; }
    if (e.items.some(it => String(it.unit_price).trim() === '' || !(Number(it.unit_price) >= 0))) { setEditErr(L('ราคาสินค้าไม่ถูกต้อง', 'Invalid price')); return; }
    if (!(Number(e.vip_discount || 0) >= 0) || !(Number(e.extra_discount || 0) >= 0)) { setEditErr(L('ส่วนลดไม่ถูกต้อง', 'Invalid discount')); return; }
    if (String(editAmount).trim() === '' || !(Number(editAmount) >= 0)) { setEditErr(L('จำนวนเงินที่รับไม่ถูกต้อง', 'Invalid amount')); return; }

    // ส่งเฉพาะส่วนของบิลขายที่แก้จริง (กันไปยุ่งสต๊อก/ลูกค้าโดยไม่จำเป็น)
    const body = { issued_at: e.issued_at, payment_method: e.payment_method, note: e.note.trim(), amount: Number(editAmount) };
    if (e.customer_name.trim() !== o.customer_name.trim() || e.customer_phone.trim() !== o.customer_phone.trim()) {
      body.customer_name = e.customer_name.trim(); body.customer_phone = e.customer_phone.trim();
    }
    const pack = (arr) => JSON.stringify(arr.map(it => [it.product_id, Number(it.qty), Number(it.unit_price)]));
    if (pack(e.items) !== pack(o.items)) {
      body.items = e.items.map(it => ({ product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.unit_price) }));
    }
    if (Number(e.vip_discount || 0) !== Number(o.vip_discount)) body.vip_discount = Number(e.vip_discount || 0);
    if (Number(e.extra_discount || 0) !== Number(o.extra_discount)) body.extra_discount = Number(e.extra_discount || 0);

    setSaving(true); setEditErr('');
    try {
      const full = await api.updateReceipt(selRc.id, body);
      setSelRc(full);
      setReceipts(prev => prev.map(r => (r.id === full.id ? { ...r, ...full } : r)));
      setEdit(null);
    } catch (err) { setEditErr(err.message || L('ไม่สามารถแก้ไขใบเสร็จได้', 'Could not update receipt')); }
    finally { setSaving(false); }
  };

  const wide = useWide();
  const openRc = (rc) => {
    setConfirmDel(false);
    setSelRc(rc);
    api.getReceipt(rc.id).then(full => setSelRc(prev => prev && prev.id === rc.id ? { ...prev, ...full } : prev)).catch(() => {});
  };
  const needle = q.trim().toLowerCase();
  const shown = receipts.filter(v => {
    if (!needle) return true;
    return `${v.receipt_no} ${v.sale_no || ''} ${v.customer_name || ''}`.toLowerCase().includes(needle);
  });
  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบเสร็จรับเงิน' : 'Receipt'} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loading} lang={lang} />
      <ScrollView contentContainerStyle={s.content}>
        <Toolbar>
          <SearchBox value={q} onChangeText={setQ}
            placeholder={lang === 'th' ? 'ค้นหาเลขที่ใบเสร็จ เลขที่บิล หรือลูกค้า' : 'Search receipt no., sale no. or customer'} />
          <PrimaryButton label={lang === 'th' ? 'ออกใบเสร็จ' : 'New receipt'} onPress={() => setShowNew(true)} />
        </Toolbar>

        {loading && <ActivityIndicator color={th.brand} style={{ marginTop: 20, marginBottom: 12 }} />}

        <Panel title={lang === 'th' ? 'ใบเสร็จทั้งหมด' : 'All receipts'}
          right={`${shown.length} ${lang === 'th' ? 'ใบ' : 'receipts'}`}>
          {wide && <TableHead cols={COLS} />}
          {!loading && shown.length === 0 && <Empty text={lang === 'th' ? 'ยังไม่มีใบเสร็จ' : 'No receipts yet'} />}
          {shown.map((rc, i) => {
            const date = new Date(rc.issued_at).toLocaleDateString('th-TH');
            const pay  = payLabel(rc.payment_method, lang);
            const last = i === shown.length - 1;
            return wide ? (
              <TableRow key={rc.id} cols={COLS} last={last} onPress={() => openRc(rc)}
                cells={[
                  <TdNo text={rc.receipt_no} />,
                  <TdMain text={rc.sale_no || '—'} />,
                  <TdMain text={rc.customer_name || 'ไม่ระบุ'} />,
                  <Pill label={pay} tone="done" />,
                  date,
                  <TdAmt text={`฿${fmt(rc.amount)}`} />,
                ]} />
            ) : (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={rc.id} onPress={() => openRc(rc)}
                style={[s.mrow, last && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardNo}>{rc.receipt_no}</Text>
                  <Text style={s.cardSub}>{rc.customer_name || 'ไม่ระบุ'} · {date}</Text>
                  {!!rc.sale_no && <Text style={s.cardSale}>{lang === 'th' ? 'การขาย' : 'Sale'}: {rc.sale_no}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.cardAmt}>฿{fmt(rc.amount)}</Text>
                  <Pill label={pay} tone="done" />
                </View>
              </TouchableOpacity>
            );
          })}
        </Panel>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW RECEIPT MODAL */}
      <ShellModal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'ออกใบเสร็จใหม่' : 'New Receipt'}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color={th.brand} />
            </TouchableOpacity>
          </View>
          {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}
          <Text style={s.fieldLabel}>{lang === 'th' ? 'เลือกรายการขาย' : 'Select a sale'}</Text>
          <ScrollView style={{ maxHeight: 260, marginBottom: 12, borderWidth: 0.5, borderColor: th.line2, borderRadius: 10 }}>
            {sales.map(sa => (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={sa.id} onPress={() => setSelSaleId(sa.id)}
                style={[s.saleRow, { backgroundColor: selSaleId === sa.id ? th.soft : th.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNo}>{sa.sale_no}</Text>
                  <Text style={s.cardSub}>{sa.customer_name || 'ไม่ระบุ'}</Text>
                </View>
                <Text style={s.cardAmt}>฿{fmt(sa.total)}</Text>
              </TouchableOpacity>
            ))}
            {sales.length === 0 && <Text style={s.emptyText}>{lang === 'th' ? 'ไม่มีรายการขาย' : 'No sales'}</Text>}
          </ScrollView>
          <Text style={s.fieldLabel}>{lang === 'th' ? 'ช่องทางชำระเงิน' : 'Payment method'}</Text>
          <View style={s.payRow}>
            {PAY_OPTIONS.map(p => (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={p.key} onPress={() => setPayMethod(p.key)}
                style={[s.payBtn, { backgroundColor: payMethod === p.key ? th.brandBg : th.card2, borderColor: payMethod === p.key ? th.brandBg : th.softer }]}>
                <Text style={[s.payBtnText, { color: payMethod === p.key ? th.brandOn : th.muted2 }]}>{lang === 'th' ? p.th : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={note} onChangeText={setNote}
            placeholder={lang === 'th' ? 'หมายเหตุ (ถ้ามี)' : 'Note (optional)'} placeholderTextColor={th.faint} />
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleIssue} disabled={issuing}
            style={[s.issueBtn, { opacity: issuing ? 0.7 : 1 }]}>
            {issuing ? <ActivityIndicator color={th.brandOn} size="small" /> : <MaterialCommunityIcons name="receipt" size={sc(18)} color={th.brandOn} />}
            <Text style={s.issueBtnText}>{issuing ? (lang === 'th' ? 'กำลังออก...' : 'Issuing...') : (lang === 'th' ? 'ออกใบเสร็จ' : 'Issue receipt')}</Text>
          </TouchableOpacity>
        </View>
      </ShellModal>

      {/* RECEIPT DETAIL MODAL */}
      <ShellModal visible={!!selRc} animationType="slide" presentationStyle="pageSheet"
        onClose={() => setSelRc(null)}>
        {selRc && (
          <ScrollView style={s.modal} contentContainerStyle={{ paddingTop: 16, paddingBottom: 30 }}>
            <DocWrapper>
              <DocHeader badge={lang === 'th' ? 'ใบเสร็จรับเงิน' : 'RECEIPT'} docNo={selRc.receipt_no}
                meta={[
                  ['วันที่', selRc.issued_at ? new Date(selRc.issued_at).toLocaleDateString('th-TH') : '—'],
                  ['อ้างอิงการขาย', selRc.sale_no || '—'],
                  ['ชำระโดย', payLabel(selRc.payment_method, lang)],
                ]} />
              <Parties
                seller={{ label: lang === 'th' ? 'ผู้รับเงิน' : 'RECEIVED BY', name: 'Anakyn Gems Co., Ltd.', sub: '131/5-6 ถ.นิตโย ต.หมากแข้ง อ.เมือง อุดรธานี 41000' }}
                buyer={{ label: lang === 'th' ? 'ผู้ชำระเงิน' : 'PAID BY', name: selRc.customer_name || 'ไม่ระบุ', sub: selRc.phone || '—' }}
              />
              <Sec>
                <SL>{lang === 'th' ? 'รายการสินค้า' : 'ITEMS'}</SL>
                <ItemHead cols={['รายการ', 'จำนวน', 'ราคา']} />
                {(selRc.items || []).map((it, i) => (
                  <ItemRow key={i} name={it.product_name || it.name || `รายการที่ ${i + 1}`} sub={it.sku}
                    qty={Number(it.qty) || 1} price={it.line_total ?? it.unit_price} />
                ))}
                {(selRc.items || []).length === 0 && <Text style={{ fontSize: 11, color: th.muted2 }}>— ไม่มีรายการ —</Text>}
              </Sec>
              {!!selRc.note && (
                <Sec>
                  <TRow label={lang === 'th' ? 'หมายเหตุ' : 'Note'} value={selRc.note} />
                </Sec>
              )}
              <GrandTotal label={lang === 'th' ? 'จำนวนเงินที่รับ' : 'Amount received'} value={fmtBaht(selRc.amount)} />
              <DocFooter>ขอบคุณที่ใช้บริการ · Anakyn Gems Co., Ltd.</DocFooter>
            </DocWrapper>
            <DocActions lang={lang} onPrint={() => printReceipt(selRc)} onSavePdf={() => saveReceipt(selRc)} />
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={openEdit} disabled={!Array.isArray(selRc.items)}
              style={[s.editBtn, !Array.isArray(selRc.items) && { opacity: 0.5 }]} activeOpacity={0.85}>
              <MaterialCommunityIcons name="pencil-outline" size={sc(16)} color={th.brand} />
              <Text style={s.editBtnText}>{lang === 'th' ? 'แก้ไขใบเสร็จ' : 'Edit receipt'}</Text>
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleDelete} style={[s.delBtn, confirmDel && s.delBtnConfirm]} activeOpacity={0.85}>
              <MaterialCommunityIcons name="trash-can-outline" size={sc(16)} color={confirmDel ? th.brandOn : th.danger} />
              <Text style={[s.delBtnText, confirmDel && { color: th.brandOn }]}>
                {confirmDel
                  ? (lang === 'th' ? 'แตะอีกครั้งเพื่อยืนยันลบ' : 'Tap again to confirm')
                  : (lang === 'th' ? 'ลบใบเสร็จ' : 'Delete')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </ShellModal>

      {/* EDIT RECEIPT MODAL — ช่องลูกค้า/สินค้า/ส่วนลด แก้ที่บิลขายต้นทางด้วย */}
      <ShellModal visible={!!edit} animationType="slide" presentationStyle="pageSheet"
        onClose={() => !saving && setEdit(null)}>
        {edit && (
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{lang === 'th' ? 'แก้ไขใบเสร็จ' : 'Edit receipt'} · {selRc?.receipt_no}</Text>
            </View>

            <Text style={s.fieldLabel}>{lang === 'th' ? 'วันที่ (ปปปป-ดด-วว)' : 'Date (YYYY-MM-DD)'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={edit.issued_at}
              onChangeText={v => setE({ issued_at: v })} placeholder="2026-11-13" placeholderTextColor={th.faint} />

            <Text style={s.fieldLabel}>{lang === 'th' ? 'ช่องทางชำระเงิน' : 'Payment method'}</Text>
            <View style={s.payRow}>
              {PAY_OPTIONS.map(p => (
                <TouchableOpacity dataSet={{ hov: 'btn' }} key={p.key} onPress={() => setE({ payment_method: p.key })}
                  style={[s.payBtn, { backgroundColor: edit.payment_method === p.key ? th.brandBg : th.card2, borderColor: edit.payment_method === p.key ? th.brandBg : th.softer }]}>
                  <Text style={[s.payBtnText, { color: edit.payment_method === p.key ? th.brandOn : th.muted2 }]}>{lang === 'th' ? p.th : p.en}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>{lang === 'th' ? 'ชื่อลูกค้า' : 'Customer name'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={edit.customer_name}
              onChangeText={v => setE({ customer_name: v })} placeholder={lang === 'th' ? 'ไม่ระบุ' : 'Not specified'} placeholderTextColor={th.faint} />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={edit.customer_phone} keyboardType="phone-pad"
              onChangeText={v => setE({ customer_phone: v })} placeholder="—" placeholderTextColor={th.faint} />

            <Text style={s.fieldLabel}>{lang === 'th' ? 'รายการสินค้า' : 'Items'}</Text>
            <View style={s.editItems}>
              {edit.items.map((it, i) => (
                <View key={`${it.product_id}-${i}`} style={[s.editItemRow, i === edit.items.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.cardNo} numberOfLines={1}>{it.name || '—'}</Text>
                    {!!it.sku && <Text style={s.cardSub}>{it.sku}</Text>}
                  </View>
                  <View style={{ width: 54 }}>
                    <Text style={s.miniLabel}>{lang === 'th' ? 'จำนวน' : 'Qty'}</Text>
                    <TextInput dataSet={{ hov: 'field' }} style={s.miniInput} value={it.qty} keyboardType="number-pad"
                      onChangeText={v => setItem(i, { qty: v.replace(/[^0-9]/g, '') })} />
                  </View>
                  <View style={{ width: 96 }}>
                    <Text style={s.miniLabel}>{lang === 'th' ? 'ราคา/หน่วย' : 'Unit price'}</Text>
                    <TextInput dataSet={{ hov: 'field' }} style={s.miniInput} value={it.unit_price} keyboardType="decimal-pad"
                      onChangeText={v => setItem(i, { unit_price: v.replace(/[^0-9.]/g, '') })} />
                  </View>
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => removeItem(i)} style={s.rmBtn}>
                    <MaterialCommunityIcons name="close" size={sc(16)} color={th.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              {edit.items.length === 0 && <Text style={s.emptyText}>{lang === 'th' ? '— ไม่มีรายการ —' : '— No items —'}</Text>}
            </View>
            <TextInput dataSet={{ hov: 'field' }} style={[s.input, { marginBottom: addResults.length ? 4 : 14 }]} value={addQ} onChangeText={setAddQ}
              placeholder={stockList === null
                ? (lang === 'th' ? 'กำลังโหลดสต๊อก...' : 'Loading stock...')
                : (lang === 'th' ? '+ เพิ่มสินค้า: ค้นหารหัสหรือชื่อสินค้า' : '+ Add item: search SKU or name')}
              placeholderTextColor={th.faint} />
            {addResults.length > 0 && (
              <View style={[s.editItems, { marginBottom: 14 }]}>
                {addResults.map((p, i) => (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} key={p.id} onPress={() => addItem(p)}
                    style={[s.editItemRow, i === addResults.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.cardNo} numberOfLines={1}>{p.sku} · {p.name}</Text>
                      <Text style={s.cardSub}>{lang === 'th' ? 'คงเหลือ' : 'In stock'} {n0(p.stock_qty)}</Text>
                    </View>
                    <Text style={s.cardAmt}>฿{fmt(p.sale_price)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{lang === 'th' ? 'ส่วนลด VIP' : 'VIP discount'}</Text>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={edit.vip_discount} keyboardType="decimal-pad"
                  onChangeText={v => setE({ vip_discount: v.replace(/[^0-9.]/g, '') })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{lang === 'th' ? 'ส่วนลดเพิ่ม' : 'Extra discount'}</Text>
                <TextInput dataSet={{ hov: 'field' }} style={s.input} value={edit.extra_discount} keyboardType="decimal-pad"
                  onChangeText={v => setE({ extra_discount: v.replace(/[^0-9.]/g, '') })} />
              </View>
            </View>
            <Text style={s.totalHint}>
              {lang === 'th' ? 'ยอดบิลขายใหม่' : 'New sale total'}{selRc?.vat_enabled === false ? '' : (lang === 'th' ? ' (รวม VAT 7%)' : ' (incl. VAT 7%)')}: ฿{fmt(editTotal)}
            </Text>

            <Text style={s.fieldLabel}>{lang === 'th' ? 'จำนวนเงินที่รับ' : 'Amount received'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={editAmount} keyboardType="decimal-pad"
              onChangeText={v => setE({ amount: v.replace(/[^0-9.]/g, ''), followTotal: false })} />

            <Text style={s.fieldLabel}>{lang === 'th' ? 'หมายเหตุ' : 'Note'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={edit.note} onChangeText={v => setE({ note: v })}
              placeholder={lang === 'th' ? 'หมายเหตุ (ถ้ามี)' : 'Note (optional)'} placeholderTextColor={th.faint} />

            <Text style={s.editWarn}>
              {lang === 'th'
                ? 'ชื่อลูกค้า รายการสินค้า และส่วนลด จะแก้ที่บิลขายต้นทางด้วย (สต๊อก ยอดขาย และค่าคอมที่ยังไม่จ่ายจะปรับตาม)'
                : 'Customer, items and discounts also update the linked sale (stock, sales total and unpaid commission follow).'}
            </Text>
            {!!editErr && <View style={s.errBox}><Text style={s.errText}>{editErr}</Text></View>}
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleSaveEdit} disabled={saving}
              style={[s.issueBtn, { opacity: saving ? 0.7 : 1 }]}>
              {saving ? <ActivityIndicator color={th.brandOn} size="small" /> : <MaterialCommunityIcons name="content-save-outline" size={sc(18)} color={th.brandOn} />}
              <Text style={s.issueBtnText}>{saving ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'บันทึกการแก้ไข' : 'Save changes')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </ShellModal>
    </View>
  );
}

const baseStyles = (th) => ({
  toolbar:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  toolbarCount: { flex: 1, fontSize: 12, color: th.muted },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: th.brandBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  primaryBtnText: { fontSize: 12.5, fontWeight: '600', color: th.brandOn },
  content:    { padding: 14, paddingBottom: 30 },
  mrow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: th.hair },
  listTitle:  { fontSize: 12, fontWeight: '500', color: th.brand, marginBottom: 10 },
  emptyText:  { fontSize: 12, color: th.muted2, textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: th.card, borderRadius: 12, borderWidth: 1, borderColor: th.line, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardNo:     { fontSize: 12, fontWeight: '500', color: th.brand },
  cardSub:    { fontSize: 11, color: th.muted2, marginTop: 2 },
  cardSale:   { fontSize: 10, color: th.dim, marginTop: 2, fontWeight: '500' },
  cardAmt:    { fontSize: 13, fontWeight: '500', color: th.ink },
  payBadge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2.5, backgroundColor: th.card, borderWidth: 1, borderColor: th.line },
  payBadgeText: { fontSize: 9.5, fontWeight: '500', color: th.muted },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: th.card, padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: th.brand },
  errBox:     { backgroundColor: th.soft, borderWidth: 0.5, borderColor: th.line3, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: th.danger },
  fieldLabel: { fontSize: 11, color: th.muted2, marginBottom: 4 },
  saleRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  payRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payBtn:     { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  payBtnText: { fontSize: 12, fontWeight: '500' },
  input:      { backgroundColor: th.card2, borderWidth: 0.5, borderColor: th.line2, borderRadius: 10, padding: 10, fontSize: 14, color: th.ink, marginBottom: 14 },
  issueBtn:   { backgroundColor: th.brandBg, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  issueBtnText: { fontSize: 15, fontWeight: '500', color: th.brandOn },
  editBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: th.line2, backgroundColor: th.card },
  editBtnText:{ fontSize: 13, fontWeight: '600', color: th.brand },
  editItems:  { borderWidth: 0.5, borderColor: th.line2, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  editItemRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: th.hair, backgroundColor: th.card },
  miniLabel:  { fontSize: 9.5, color: th.muted2, marginBottom: 2 },
  miniInput:  { backgroundColor: th.card2, borderWidth: 0.5, borderColor: th.line2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: th.ink },
  rmBtn:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  totalHint:  { fontSize: 12.5, fontWeight: '600', color: th.ink, marginTop: -4, marginBottom: 12 },
  editWarn:   { fontSize: 11, color: th.muted2, marginBottom: 12, lineHeight: 16 },
  delBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: th.line3, backgroundColor: th.card },
  delBtnConfirm: { backgroundColor: th.danger, borderColor: th.danger },
  delBtnText: { fontSize: 13, fontWeight: '600', color: th.danger },
});
