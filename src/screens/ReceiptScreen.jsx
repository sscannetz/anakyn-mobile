// ══════════════════════════════════════════════════════
// ReceiptScreen.jsx — ใบเสร็จรับเงิน (ออกจากรายการขาย)
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
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
  delBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: th.line3, backgroundColor: th.card },
  delBtnConfirm: { backgroundColor: th.danger, borderColor: th.danger },
  delBtnText: { fontSize: 13, fontWeight: '600', color: th.danger },
});
