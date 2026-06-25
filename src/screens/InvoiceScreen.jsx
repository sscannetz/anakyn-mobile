// ══════════════════════════════════════════════════════
// InvoiceScreen.jsx — React Native version of AnakynInvoice
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { api } from '../api';
import { printInvoice } from '../print';
import { DocWrapper, DocHeader, Parties, Sec, SL, ItemHead, ItemRow, TRow, GrandTotal, DocFooter, fmtBaht } from '../components/DocLayout';

const T = {
  th: {
    pageTitle: 'Invoice', listTitle: 'ใบกำกับภาษีทั้งหมด',
    newTitle: 'ออกใบกำกับภาษีใหม่', selectSale: 'เลือกรายการขาย',
    issueBtnLabel: 'ออกใบกำกับภาษี', issuing: 'กำลังออก...',
    noInvoices: 'ยังไม่มีใบกำกับภาษี', loading: 'กำลังโหลด...',
    badge: 'ใบกำกับภาษี', seller: 'ผู้ขาย', buyer: 'ผู้ซื้อ',
    items: 'รายการสินค้า', subtotal: 'รวมก่อนส่วนลด', vat: 'VAT 7%',
    grand: 'ยอดรวมทั้งสิ้น', noSales: 'ไม่มีรายการขาย',
    vatOn: 'มี VAT', vatOff: 'ไม่มี VAT',
  },
  en: {
    pageTitle: 'Invoice', listTitle: 'All Invoices',
    newTitle: 'Issue new invoice', selectSale: 'Select a sale',
    issueBtnLabel: 'Issue invoice', issuing: 'Issuing...',
    noInvoices: 'No invoices yet', loading: 'Loading...',
    badge: 'TAX INVOICE', seller: 'Seller', buyer: 'Buyer',
    items: 'Items', subtotal: 'Subtotal', vat: 'VAT 7%',
    grand: 'Grand Total', noSales: 'No sales',
    vatOn: 'Incl. VAT', vatOff: 'Excl. VAT',
  },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

const STATUS_STYLE = {
  draft:  { bg: '#f5f5f5', col: '#666',    label: 'Draft'    },
  issued: { bg: '#e0f0ff', col: '#1a3a60', label: 'Issued'   },
  paid:   { bg: '#e8f5e9', col: '#1a5c28', label: 'Paid'     },
  void:   { bg: '#fdf0f2', col: '#7a1c2e', label: 'Void'     },
};

export default function InvoiceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const t = T[lang];
  const [invoices, setInvoices]   = useState([]);
  const [sales, setSales]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [selSaleId, setSelSaleId] = useState(null);
  const [vatOn, setVatOn]         = useState(true);
  const [issuing, setIssuing]     = useState(false);
  const [error, setError]         = useState('');
  const [selInvoice, setSelInvoice] = useState(null);

  useEffect(() => {
    api.getInvoices().then(setInvoices).finally(() => setLoading(false));
    api.getSales().then(setSales).catch(() => {});
  }, []);

  const selSale = sales.find(s => s.id === selSaleId);

  const handleIssue = async () => {
    if (!selSaleId) { setError(lang === 'th' ? 'กรุณาเลือกรายการขาย' : 'Please select a sale'); return; }
    setIssuing(true); setError('');
    try {
      const inv = await api.createInvoice({ sale_id: selSaleId, vat_enabled: vatOn });
      setInvoices(prev => [inv, ...prev]);
      setShowNew(false); setSelSaleId(null);
    } catch (err) { setError(err.message || 'ไม่สามารถออกใบกำกับได้'); }
    finally { setIssuing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={t.pageTitle} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')}
        rightComponent={
          <TouchableOpacity onPress={() => setShowNew(true)} style={styles.newBtn}>
            <MaterialCommunityIcons name="plus" size={16} color="#f5e0e5" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.listTitle}>{t.listTitle}</Text>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && invoices.length === 0 && <Text style={styles.emptyText}>{t.noInvoices}</Text>}
        {invoices.map(inv => {
          const st = STATUS_STYLE[inv.status] || STATUS_STYLE.draft;
          return (
            <TouchableOpacity key={inv.id} onPress={() => { setSelInvoice(inv); api.getInvoice(inv.id).then(full => setSelInvoice(prev => prev && prev.id === inv.id ? { ...prev, ...full } : prev)).catch(() => {}); }} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardNo}>{inv.invoice_no}</Text>
                <Text style={styles.cardSub}>{inv.customer_name || 'ไม่ระบุ'} · {new Date(inv.issued_at).toLocaleDateString('th-TH')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.cardAmt}>฿{fmt(inv.grand_total)}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.col }]}>{st.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW INVOICE MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.newTitle}</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          {!!error && <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>}
          <Text style={styles.fieldLabel}>{t.selectSale}</Text>
          <ScrollView style={{ maxHeight: 300, marginBottom: 12, borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10 }}>
            {sales.map(s => (
              <TouchableOpacity key={s.id} onPress={() => setSelSaleId(s.id)}
                style={[styles.saleRow, { backgroundColor: selSaleId === s.id ? '#fdf0f2' : '#fff' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNo}>{s.sale_no}</Text>
                  <Text style={styles.cardSub}>{s.customer_name || 'ไม่ระบุ'}</Text>
                </View>
                <Text style={styles.cardAmt}>฿{fmt(s.total)}</Text>
              </TouchableOpacity>
            ))}
            {sales.length === 0 && <Text style={styles.emptyText}>{t.noSales}</Text>}
          </ScrollView>
          <View style={styles.vatRow}>
            {[[t.vatOn, true],[t.vatOff, false]].map(([label, val]) => (
              <TouchableOpacity key={label} onPress={() => setVatOn(val)}
                style={[styles.vatBtn, { backgroundColor: vatOn === val ? '#550a19' : '#f9f4f5', borderColor: vatOn === val ? '#550a19' : '#e8d5d9' }]}>
                <Text style={[styles.vatBtnText, { color: vatOn === val ? '#f5e0e5' : '#a07080' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={handleIssue} disabled={issuing}
            style={[styles.issueBtn, { opacity: issuing ? 0.7 : 1 }]}>
            {issuing ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="receipt" size={18} color="#fff5f7" />}
            <Text style={styles.issueBtnText}>{issuing ? t.issuing : t.issueBtnLabel}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* INVOICE DETAIL MODAL */}
      <Modal visible={!!selInvoice} animationType="slide" presentationStyle="pageSheet">
        {selInvoice && (
          <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selInvoice.invoice_no}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={() => printInvoice(selInvoice)}>
                  <MaterialCommunityIcons name="printer" size={22} color="#550a19" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelInvoice(null)}>
                  <MaterialCommunityIcons name="close" size={22} color="#550a19" />
                </TouchableOpacity>
              </View>
            </View>
            <DocWrapper>
              <DocHeader badge={t.badge} docNo={selInvoice.invoice_no}
                meta={[
                  ['วันที่', selInvoice.issued_at ? new Date(selInvoice.issued_at).toLocaleDateString('th-TH') : '—'],
                  ['อ้างอิง', selInvoice.sale_no || '—'],
                  ['VAT', selInvoice.vat_applied === false ? 'ไม่มี' : '7%'],
                ]} />
              <Parties
                seller={{ label: t.seller, name: 'Anakyn Gems Co., Ltd.', sub: '123 ถ.สีลม กรุงเทพฯ 10500' }}
                buyer={{ label: t.buyer, name: selInvoice.customer_name || 'ไม่ระบุ', sub: selInvoice.customer_phone || '—' }}
              />
              <Sec>
                <SL>รายการสินค้า</SL>
                <ItemHead cols={['รายการ', '', 'ราคา']} />
                {(selInvoice.items || []).map((item, i) => (
                  <ItemRow key={i} name={item.product_name || item.name} sub={item.sku} price={item.unit_price ?? item.line_total} />
                ))}
                {(selInvoice.items || []).length === 0 && <Text style={{ fontSize: 11, color: '#a07080' }}>— ไม่มีรายการ —</Text>}
              </Sec>
              <Sec>
                <TRow label={t.subtotal} value={fmtBaht(selInvoice.subtotal ?? selInvoice.grand_total)} />
                <TRow label={t.vat} value={fmtBaht(selInvoice.vat_amount)} />
              </Sec>
              <GrandTotal label={t.grand} value={fmtBaht(selInvoice.grand_total)} />
              <DocFooter>ขอบคุณที่ใช้บริการ · Anakyn Gems Co., Ltd.</DocFooter>
            </DocWrapper>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content:      { padding: 14, paddingBottom: 30 },
  listTitle:    { fontSize: 12, fontWeight: '500', color: '#550a19', marginBottom: 10 },
  emptyText:    { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:         { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  cardNo:       { fontSize: 12, fontWeight: '500', color: '#550a19' },
  cardSub:      { fontSize: 11, color: '#a07080', marginTop: 2 },
  cardAmt:      { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  badge:        { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:    { fontSize: 9, fontWeight: '500' },
  newBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:        { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:       { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:      { fontSize: 12, color: '#a32d2d' },
  fieldLabel:   { fontSize: 11, color: '#a07080', marginBottom: 4 },
  saleRow:      { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  vatRow:       { flexDirection: 'row', gap: 8, marginBottom: 14 },
  vatBtn:       { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  vatBtnText:   { fontSize: 13, fontWeight: '500' },
  issueBtn:     { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  issueBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  docHeader:    { backgroundColor: '#550a19', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginHorizontal: -16, marginBottom: 0 },
  docBrandLg:   { fontSize: 18, fontWeight: '600', color: '#fff5f7', letterSpacing: 3 },
  docBrandSm:   { fontSize: 8, color: '#d4a0ac', letterSpacing: 4 },
  docBadge:     { alignItems: 'flex-end' },
  docBadgeText: { fontSize: 9, color: '#f0d0d8', letterSpacing: 2, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  docNo:        { fontSize: 13, fontWeight: '500', color: '#fff5f7' },
  docParties:   { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8', marginHorizontal: -16 },
  docParty:     { flex: 1, padding: 12 },
  docPartyLabel:{ fontSize: 9, color: '#a07080', letterSpacing: 1.5, marginBottom: 4 },
  docPartyName: { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  docPartySub:  { fontSize: 10, color: '#a07080', lineHeight: 15, marginTop: 2 },
  itemRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f9f4f5' },
  itemName:     { fontSize: 12, color: '#2c1015' },
  itemAmt:      { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel:   { fontSize: 12, color: '#806070' },
  totalVal:     { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  grandRow:     { backgroundColor: '#550a19', marginHorizontal: -16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  grandLabel:   { fontSize: 13, fontWeight: '500', color: '#f0d0d8' },
  grandVal:     { fontSize: 20, fontWeight: '500', color: '#fff5f7' },
});
