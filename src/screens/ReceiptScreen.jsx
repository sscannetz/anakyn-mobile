// ══════════════════════════════════════════════════════
// ReceiptScreen.jsx — ใบเสร็จรับเงิน (ออกจากรายการขาย)
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { api } from '../api';
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

export default function ReceiptScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang]         = useState('th');
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

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบเสร็จรับเงิน' : 'Receipt'} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')}
        rightComponent={
          <TouchableOpacity onPress={() => setShowNew(true)} style={s.iconBtn}>
            <MaterialCommunityIcons name="plus" size={16} color="#f5e0e5" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.listTitle}>{lang === 'th' ? 'ใบเสร็จทั้งหมด' : 'All Receipts'}</Text>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && receipts.length === 0 && <Text style={s.emptyText}>{lang === 'th' ? 'ยังไม่มีใบเสร็จ' : 'No receipts yet'}</Text>}
        {receipts.map(rc => (
          <TouchableOpacity key={rc.id} onPress={() => {
              setConfirmDel(false);
              setSelRc(rc);
              api.getReceipt(rc.id).then(full => setSelRc(prev => prev && prev.id === rc.id ? { ...prev, ...full } : prev)).catch(() => {});
            }} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardNo}>{rc.receipt_no}</Text>
              <Text style={s.cardSub}>{rc.customer_name || 'ไม่ระบุ'} · {new Date(rc.issued_at).toLocaleDateString('th-TH')}</Text>
              {!!rc.sale_no && <Text style={s.cardSale}>{lang === 'th' ? 'การขาย' : 'Sale'}: {rc.sale_no}{rc.total != null ? ` · ฿${fmt(rc.total)}` : ''}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={s.cardAmt}>฿{fmt(rc.amount)}</Text>
              <View style={s.payBadge}>
                <Text style={s.payBadgeText}>{payLabel(rc.payment_method, lang)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW RECEIPT MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'ออกใบเสร็จใหม่' : 'New Receipt'}</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}
          <Text style={s.fieldLabel}>{lang === 'th' ? 'เลือกรายการขาย' : 'Select a sale'}</Text>
          <ScrollView style={{ maxHeight: 260, marginBottom: 12, borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10 }}>
            {sales.map(sa => (
              <TouchableOpacity key={sa.id} onPress={() => setSelSaleId(sa.id)}
                style={[s.saleRow, { backgroundColor: selSaleId === sa.id ? '#fdf0f2' : '#fff' }]}>
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
              <TouchableOpacity key={p.key} onPress={() => setPayMethod(p.key)}
                style={[s.payBtn, { backgroundColor: payMethod === p.key ? '#550a19' : '#f9f4f5', borderColor: payMethod === p.key ? '#550a19' : '#e8d5d9' }]}>
                <Text style={[s.payBtnText, { color: payMethod === p.key ? '#f5e0e5' : '#a07080' }]}>{lang === 'th' ? p.th : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.input} value={note} onChangeText={setNote}
            placeholder={lang === 'th' ? 'หมายเหตุ (ถ้ามี)' : 'Note (optional)'} placeholderTextColor="#c0a0a8" />
          <TouchableOpacity onPress={handleIssue} disabled={issuing}
            style={[s.issueBtn, { opacity: issuing ? 0.7 : 1 }]}>
            {issuing ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="receipt" size={18} color="#fff5f7" />}
            <Text style={s.issueBtnText}>{issuing ? (lang === 'th' ? 'กำลังออก...' : 'Issuing...') : (lang === 'th' ? 'ออกใบเสร็จ' : 'Issue receipt')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* RECEIPT DETAIL MODAL */}
      <Modal visible={!!selRc} animationType="slide" presentationStyle="pageSheet">
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
                seller={{ label: lang === 'th' ? 'ผู้รับเงิน' : 'RECEIVED BY', name: 'Anakyn Gems Co., Ltd.', sub: '123 ถ.สีลม กรุงเทพฯ 10500' }}
                buyer={{ label: lang === 'th' ? 'ผู้ชำระเงิน' : 'PAID BY', name: selRc.customer_name || 'ไม่ระบุ', sub: selRc.phone || '—' }}
              />
              <Sec>
                <SL>{lang === 'th' ? 'รายการสินค้า' : 'ITEMS'}</SL>
                <ItemHead cols={['รายการ', 'จำนวน', 'ราคา']} />
                {(selRc.items || []).map((it, i) => (
                  <ItemRow key={i} name={it.product_name || it.name || `รายการที่ ${i + 1}`} sub={it.sku}
                    qty={Number(it.qty) || 1} price={it.line_total ?? it.unit_price} />
                ))}
                {(selRc.items || []).length === 0 && <Text style={{ fontSize: 11, color: '#a07080' }}>— ไม่มีรายการ —</Text>}
              </Sec>
              {!!selRc.note && (
                <Sec>
                  <TRow label={lang === 'th' ? 'หมายเหตุ' : 'Note'} value={selRc.note} />
                </Sec>
              )}
              <GrandTotal label={lang === 'th' ? 'จำนวนเงินที่รับ' : 'Amount received'} value={fmtBaht(selRc.amount)} />
              <DocFooter>ขอบคุณที่ใช้บริการ · Anakyn Gems Co., Ltd.</DocFooter>
            </DocWrapper>
            <DocActions lang={lang} onPrint={() => printReceipt(selRc)} onSavePdf={() => saveReceipt(selRc)} onBack={() => setSelRc(null)} />
            <TouchableOpacity onPress={handleDelete} style={[s.delBtn, confirmDel && s.delBtnConfirm]} activeOpacity={0.85}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={confirmDel ? '#fff' : '#a32d2d'} />
              <Text style={[s.delBtnText, confirmDel && { color: '#fff' }]}>
                {confirmDel
                  ? (lang === 'th' ? 'แตะอีกครั้งเพื่อยืนยันลบ' : 'Tap again to confirm')
                  : (lang === 'th' ? 'ลบใบเสร็จ' : 'Delete')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  content:    { padding: 14, paddingBottom: 30 },
  listTitle:  { fontSize: 12, fontWeight: '500', color: '#550a19', marginBottom: 10 },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  cardNo:     { fontSize: 12, fontWeight: '500', color: '#550a19' },
  cardSub:    { fontSize: 11, color: '#a07080', marginTop: 2 },
  cardSale:   { fontSize: 10, color: '#806070', marginTop: 2, fontWeight: '500' },
  cardAmt:    { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  payBadge:   { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#e8f5e9' },
  payBadgeText: { fontSize: 9, fontWeight: '500', color: '#1a5c28' },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:     { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  saleRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  payRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payBtn:     { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  payBtnText: { fontSize: 12, fontWeight: '500' },
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, padding: 10, fontSize: 14, color: '#2c1015', marginBottom: 14 },
  issueBtn:   { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  issueBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  delBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e8c0c8', backgroundColor: '#fff' },
  delBtnConfirm: { backgroundColor: '#a32d2d', borderColor: '#a32d2d' },
  delBtnText: { fontSize: 13, fontWeight: '600', color: '#a32d2d' },
});
