// ══════════════════════════════════════════════════════
// InvoiceScreen.jsx — React Native version of AnakynInvoice
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, FlatList,
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
import { printInvoice, saveInvoice } from '../print';
import { DocWrapper, DocHeader, Parties, Sec, SL, ItemHead, ItemRow, TRow, VatRow, GrandTotal, DocFooter, DocActions, fmtBaht } from '../components/DocLayout';

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

// ป้ายสถานะ: ใบที่ยังต้องตามเก็บเงิน = แดงอ่อน · ใบที่จบแล้ว = ขาวเส้นบาง
const STATUS_STYLE = {
  draft:  { bg: '#ffffff', col: '#9b7d86', label: 'Draft'  },
  issued: { bg: '#fdf0f2', col: '#8c1b2f', label: 'Issued' },
  paid:   { bg: '#ffffff', col: '#9b7d86', label: 'Paid'   },
  void:   { bg: '#ffffff', col: '#b08090', label: 'Void'   },
};

const FILTERS = [
  { key: 'all',    th: 'ทั้งหมด',    en: 'All' },
  { key: 'issued', th: 'ยังไม่ชำระ', en: 'Unpaid' },
  { key: 'paid',   th: 'ชำระแล้ว',   en: 'Paid' },
];
const TONE = { draft: 'done', issued: 'attn', paid: 'done', void: 'dim' };
const COLS = [
  { label: 'เลขที่', w: 125 },
  { label: 'วันที่', w: 95 },
  { label: 'ลูกค้า' },
  { label: 'สถานะ', w: 95 },
  { label: 'ยอดรวม', w: 100, rt: true },
];

export default function InvoiceScreen({ navigation }) {
  const { styles, sc, center, t: th } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const t = T[lang];
  const [invoices, setInvoices]   = useState([]);
  const [sales, setSales]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [selSaleId, setSelSaleId] = useState(null);
  const [vatOn, setVatOn]         = useState(true);
  const [vatRate, setVatRate]     = useState('7');   // อัตรา VAT ตอนสร้าง (ปรับเองได้)
  const [issuing, setIssuing]     = useState(false);
  const [error, setError]         = useState('');
  const [selInvoice, setSelInvoice] = useState(null);
  const [dVatOn, setDVatOn]   = useState(true);   // VAT ของหน้ารายละเอียด (ปรับสดได้)
  const [dVatRate, setDVatRate] = useState('7');

  useEffect(() => {
    api.getInvoices().then(setInvoices).finally(() => setLoading(false));
    api.getSales().then(setSales).catch(() => {});
  }, []);

  const selSale = sales.find(s => s.id === selSaleId);

  const handleIssue = async () => {
    if (!selSaleId) { setError(lang === 'th' ? 'กรุณาเลือกรายการขาย' : 'Please select a sale'); return; }
    setIssuing(true); setError('');
    try {
      const inv = await api.createInvoice({ sale_id: selSaleId, vat_applied: vatOn, vat_rate: parseFloat(vatRate) || 7 });
      setInvoices(prev => [inv, ...prev]);
      setShowNew(false); setSelSaleId(null);
    } catch (err) { setError(err.message || 'ไม่สามารถออกใบกำกับได้'); }
    finally { setIssuing(false); }
  };

  const wide = useWide();
  const openInvoice = (inv) => {
    const b = Number(inv.subtotal ?? inv.tax_base) || 0;
    setDVatOn(inv.vat_applied !== false);
    setDVatRate(b > 0 && Number(inv.vat_amount) > 0 ? String(Math.round(Number(inv.vat_amount) / b * 100)) : '7');
    setSelInvoice(inv);
    api.getInvoice(inv.id).then(full => setSelInvoice(prev => prev && prev.id === inv.id ? { ...prev, ...full } : prev)).catch(() => {});
  };
  const needle = q.trim().toLowerCase();
  const shown = invoices.filter(v => {
    if (filter !== 'all' && v.status !== filter) return false;
    if (!needle) return true;
    return `${v.invoice_no} ${v.customer_name || ''}`.toLowerCase().includes(needle);
  });
  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: insets.top }}>
      <Header title={t.pageTitle} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loading} lang={lang} />
      <ScrollView contentContainerStyle={styles.content}>
        <Toolbar>
          <SearchBox value={q} onChangeText={setQ}
            placeholder={lang === 'th' ? 'ค้นหาเลขที่ใบกำกับ หรือชื่อลูกค้า' : 'Search invoice no. or customer'} />
          {FILTERS.map(f => (
            <Chip key={f.key} label={lang === 'th' ? f.th : f.en} on={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <PrimaryButton label={lang === 'th' ? 'ออกใบกำกับภาษี' : 'New invoice'} onPress={() => setShowNew(true)} />
        </Toolbar>

        {loading && <ActivityIndicator color={th.brand} style={{ marginTop: 20, marginBottom: 12 }} />}

        <Panel title={t.listTitle} right={`${shown.length} ${lang === 'th' ? 'ใบ' : 'invoices'}`}>
          {wide && <TableHead cols={COLS} />}
          {!loading && shown.length === 0 && <Empty text={t.noInvoices} />}
          {shown.map((inv, i) => {
            const st   = STATUS_STYLE[inv.status] || STATUS_STYLE.draft;
            const tone = TONE[inv.status] || 'done';
            const date = inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('th-TH') : '—';
            const last = i === shown.length - 1;
            return wide ? (
              <TableRow key={inv.id} cols={COLS} last={last} onPress={() => openInvoice(inv)}
                cells={[
                  <TdNo text={inv.invoice_no} />,
                  date,
                  <TdMain text={inv.customer_name || 'ไม่ระบุ'} />,
                  <Pill label={st.label} tone={tone} />,
                  <TdAmt text={`฿${fmt(inv.grand_total)}`} />,
                ]} />
            ) : (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={inv.id} onPress={() => openInvoice(inv)}
                style={[styles.mrow, last && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardNo}>{inv.invoice_no}</Text>
                  <Text style={styles.cardSub}>{inv.customer_name || 'ไม่ระบุ'} · {date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.cardAmt}>฿{fmt(inv.grand_total)}</Text>
                  <Pill label={st.label} tone={tone} />
                </View>
              </TouchableOpacity>
            );
          })}
        </Panel>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW INVOICE MODAL */}
      <ShellModal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.newTitle}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color={th.brand} />
            </TouchableOpacity>
          </View>
          {!!error && <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>}
          <Text style={styles.fieldLabel}>{t.selectSale}</Text>
          <ScrollView style={{ maxHeight: 300, marginBottom: 12, borderWidth: 0.5, borderColor: th.line2, borderRadius: 10 }}>
            {sales.map(s => (
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={s.id} onPress={() => setSelSaleId(s.id)}
                style={[styles.saleRow, { backgroundColor: selSaleId === s.id ? th.soft : th.card }]}>
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
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={label} onPress={() => setVatOn(val)}
                style={[styles.vatBtn, { backgroundColor: vatOn === val ? th.brandBg : th.card2, borderColor: vatOn === val ? th.brandBg : th.softer }]}>
                <Text style={[styles.vatBtnText, { color: vatOn === val ? th.brandOn : th.muted2 }]}>{label}</Text>
              </TouchableOpacity>
            ))}
            {vatOn && (
              <View style={styles.rateBox}>
                <TextInput dataSet={{ hov: 'field' }} value={vatRate} onChangeText={setVatRate} keyboardType="numeric" maxLength={5} selectTextOnFocus style={styles.rateInput} />
                <Text style={styles.ratePct}>%</Text>
              </View>
            )}
          </View>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleIssue} disabled={issuing}
            style={[styles.issueBtn, { opacity: issuing ? 0.7 : 1 }]}>
            {issuing ? <ActivityIndicator color={th.brandOn} size="small" /> : <MaterialCommunityIcons name="receipt" size={sc(18)} color={th.brandOn} />}
            <Text style={styles.issueBtnText}>{issuing ? t.issuing : t.issueBtnLabel}</Text>
          </TouchableOpacity>
        </View>
      </ShellModal>

      {/* INVOICE DETAIL MODAL */}
      <ShellModal visible={!!selInvoice} animationType="slide" presentationStyle="pageSheet"
        onClose={() => setSelInvoice(null)}>
        {selInvoice && (
          <ScrollView style={styles.modal} contentContainerStyle={{ paddingTop: 16, paddingBottom: 30 }}>
            {(() => {
              const base = Number(selInvoice.subtotal ?? selInvoice.tax_base ?? selInvoice.grand_total) || 0;
              const rate = parseFloat(dVatRate) || 0;
              const vatAmt = dVatOn ? Math.round(base * rate / 100) : 0;
              const grand = base + vatAmt;
              const docObj = { ...selInvoice, subtotal: base, vat_amount: vatAmt, grand_total: grand, vat_applied: dVatOn, vat_rate: rate };
              return (
                <>
                  <DocWrapper>
                    <DocHeader badge={t.badge} docNo={selInvoice.invoice_no}
                      meta={[
                        ['วันที่', selInvoice.issued_at ? new Date(selInvoice.issued_at).toLocaleDateString('th-TH') : '—'],
                        ['อ้างอิง', selInvoice.sale_no || '—'],
                        ['VAT', dVatOn ? `${rate}%` : 'ไม่มี'],
                      ]} />
                    <Parties
                      seller={{ label: t.seller, name: 'Anakyn Gems Co., Ltd.', sub: '131/5-6 ถ.นิตโย ต.หมากแข้ง อ.เมือง อุดรธานี 41000' }}
                      buyer={{ label: t.buyer, name: selInvoice.customer_name || 'ไม่ระบุ', sub: selInvoice.customer_phone || '—' }}
                    />
                    <Sec>
                      <SL>รายการสินค้า</SL>
                      <ItemHead cols={['รายการ', '', 'ราคา']} />
                      {(selInvoice.items || []).map((item, i) => (
                        <ItemRow key={i} name={item.product_name || item.name} sub={item.sku} price={item.unit_price ?? item.line_total} />
                      ))}
                      {(selInvoice.items || []).length === 0 && <Text style={{ fontSize: 11, color: th.muted2 }}>— ไม่มีรายการ —</Text>}
                    </Sec>
                    <Sec>
                      <TRow label={t.subtotal} value={fmtBaht(base)} />
                      <VatRow enabled={dVatOn} rate={dVatRate} amount={vatAmt} onToggle={setDVatOn} onRate={setDVatRate} lang={lang} />
                    </Sec>
                    <GrandTotal label={t.grand} value={fmtBaht(grand)} />
                    <DocFooter>ขอบคุณที่ใช้บริการ · Anakyn Gems Co., Ltd.</DocFooter>
                  </DocWrapper>
                  <DocActions lang={lang} onPrint={() => printInvoice(docObj)} onSavePdf={() => saveInvoice(docObj)} />
                </>
              );
            })()}
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
  content:      { padding: 14, paddingBottom: 30 },
  mrow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: th.hair },
  listTitle:    { fontSize: 12, fontWeight: '500', color: th.brand, marginBottom: 10 },
  emptyText:    { fontSize: 12, color: th.muted2, textAlign: 'center', paddingVertical: 20 },
  card:         { backgroundColor: th.card, borderRadius: 12, borderWidth: 1, borderColor: th.line, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardNo:       { fontSize: 12, fontWeight: '500', color: th.brand },
  cardSub:      { fontSize: 11, color: th.muted2, marginTop: 2 },
  cardAmt:      { fontSize: 13, fontWeight: '500', color: th.ink },
  badge:        { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2.5, borderWidth: 1, borderColor: th.line },
  badgeText:    { fontSize: 9, fontWeight: '500' },
  newBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:        { flex: 1, backgroundColor: th.card, padding: 16 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '500', color: th.brand },
  errBox:       { backgroundColor: th.soft, borderWidth: 0.5, borderColor: th.line3, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:      { fontSize: 12, color: th.danger },
  fieldLabel:   { fontSize: 11, color: th.muted2, marginBottom: 4 },
  saleRow:      { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  vatRow:       { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'stretch' },
  vatBtn:       { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  vatBtnText:   { fontSize: 13, fontWeight: '500' },
  rateBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: th.softer, borderWidth: 0.5, borderColor: th.line3, borderRadius: 10, paddingHorizontal: 10 },
  rateInput:    { fontSize: 15, fontWeight: '600', color: th.brand, minWidth: 30, textAlign: 'right', paddingVertical: 0 },
  ratePct:      { fontSize: 13, color: th.muted2, marginLeft: 2 },
  issueBtn:     { backgroundColor: th.brandBg, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  issueBtnText: { fontSize: 15, fontWeight: '500', color: th.brandOn },
  docHeader:    { backgroundColor: th.brandBg, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginHorizontal: -16, marginBottom: 0 },
  docBrandLg:   { fontSize: 18, fontWeight: '600', color: th.brandOn, letterSpacing: 3 },
  docBrandSm:   { fontSize: 8, color: th.dim, letterSpacing: 4 },
  docBadge:     { alignItems: 'flex-end' },
  docBadgeText: { fontSize: 9, color: th.brandOn, letterSpacing: 2, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  docNo:        { fontSize: 13, fontWeight: '500', color: th.brandOn },
  docParties:   { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: th.hair, marginHorizontal: -16 },
  docParty:     { flex: 1, padding: 12 },
  docPartyLabel:{ fontSize: 9, color: th.muted2, letterSpacing: 1.5, marginBottom: 4 },
  docPartyName: { fontSize: 12, fontWeight: '500', color: th.ink },
  docPartySub:  { fontSize: 10, color: th.muted2, lineHeight: 15, marginTop: 2 },
  itemRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  itemName:     { fontSize: 12, color: th.ink },
  itemAmt:      { fontSize: 12, fontWeight: '500', color: th.ink },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel:   { fontSize: 12, color: th.dim },
  totalVal:     { fontSize: 12, fontWeight: '500', color: th.ink },
  grandRow:     { backgroundColor: th.brandBg, marginHorizontal: -16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  grandLabel:   { fontSize: 13, fontWeight: '500', color: th.brandOn },
  grandVal:     { fontSize: 20, fontWeight: '500', color: th.brandOn },
});
