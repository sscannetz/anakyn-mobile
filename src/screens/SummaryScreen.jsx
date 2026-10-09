// ══════════════════════════════════════════════════════
// SummaryScreen.jsx — React Native version of AnakynSummary
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printSummary } from '../print';
import { useWide, Chip } from '../components/DataPanel';
import ShellModal from '../components/ShellModal';
import DateInput from '../components/DateInput';

const T = {
  th: {
    periods: ['วันนี้','สัปดาห์นี้','เดือนนี้','ปีนี้'],
    periodKeys: ['today','week','month','year'],
    custom: 'เลือกช่วงวันที่', pickRange: 'เลือกช่วงวันที่',
    dFrom: 'ตั้งแต่วันที่', dTo: 'ถึงวันที่', apply: 'ตกลง', cancel: 'ยกเลิก',
    unitPcs: 'ออเดอร์',
    revenue: 'รายได้รวม', orders: 'จำนวนออเดอร์',
    profit: 'กำไรสุทธิ', profitMargin: 'อัตรากำไร',
    vatCollected: 'VAT ที่เก็บได้',
    topSales: 'สินค้าขายดี', rank: '#', item: 'สินค้า', qty: 'จำนวน', amount: 'ยอด',
    moreLines: (n) => `และอีก ${n} รายการ`,
    payBreakdown: 'ช่องทางชำระเงิน',
    pendingSection: 'รายการค้างอยู่',
    pendingPO: 'PO ค้าง', pendingSrv: 'งานซ่อมค้าง', pendingQt: 'ใบเสนอราคา',
    chartTitle: 'ยอดขายรายวัน (7 วันล่าสุด)',
    noData: 'ไม่มีข้อมูล', loading: 'กำลังโหลด...',
  },
  en: {
    periods: ['Today','This week','This month','This year'],
    periodKeys: ['today','week','month','year'],
    custom: 'Date range', pickRange: 'Select date range',
    dFrom: 'From', dTo: 'To', apply: 'Apply', cancel: 'Cancel',
    unitPcs: 'orders',
    revenue: 'Total revenue', orders: 'Orders',
    profit: 'Net profit', profitMargin: 'Margin',
    vatCollected: 'VAT collected',
    topSales: 'Top selling items', rank: '#', item: 'Item', qty: 'Qty', amount: 'Amount',
    moreLines: (n) => `and ${n} more`,
    payBreakdown: 'Payment breakdown',
    pendingSection: 'Pending items',
    pendingPO: 'Purchase orders', pendingSrv: 'Service orders', pendingQt: 'Quotations',
    chartTitle: 'Daily sales (last 7 days)',
    noData: 'No data', loading: 'Loading...',
  },
};

const fmt    = (n) => { const x = Number(n); return Math.round(Number.isFinite(x) ? x : 0).toLocaleString('th-TH'); };
const fmtCp  = (n) => { n = Number(n); if (!Number.isFinite(n)) n = 0; return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(Math.round(n)); };

function KPICard({ label, value, sub, icon, col, bg, subUp, wide, unit }) {
  const { styles: s, sc, center, t: th } = useScaledStyles(baseStyles);
  return (
    <View style={[s.kpiCard, wide && s.kpiCardWide]}>
      <View style={s.kpiTop}>
        <Text style={s.kpiLabel}>{label}</Text>
        <View style={[s.kpiIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon} size={sc(13)} color={col} />
        </View>
      </View>
      {/* ใส่ unit มา = เป็นจำนวนนับ ไม่ใช่เงิน (ห้ามขึ้น ฿ หน้าเลข) */}
      <Text style={s.kpiVal}>{unit ? `${fmt(value)} ${unit}` : `฿${fmtCp(value)}`}</Text>
      {sub && (
        <Text style={[s.kpiSub, { color: subUp ? th.ok : th.danger }]}>
          {subUp ? '▲' : '▼'} {sub}
        </Text>
      )}
    </View>
  );
}

export default function SummaryScreen({ navigation }) {
  const { styles: s, sc, center, t: th } = useScaledStyles(baseStyles);
  const insets  = useSafeAreaInsets();
  const wide    = useWide(1000);
  const [lang, setLang]   = useState('th');
  const [period, setPeriod] = useState(2);   // 0-3 = ชิปช่วงเวลา, 4 = ช่วงวันที่ที่เลือกเอง
  const [range, setRange]   = useState(null); // { from, to } = 'YYYY-MM-DD' เมื่อเลือกช่วงเอง
  const [pick, setPick]     = useState(null); // ค่าที่กำลังกรอกในกล่องปฏิทิน
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  // แถบ "กำลังเชื่อมต่อ" โชว์แค่รอบแรก — สลับช่วงเวลาแล้วโหลดใหม่ไม่ต้องโชว์ซ้ำ
  const [firstLoad, setFirstLoad] = useState(true);
  const t = T[lang];

  useEffect(() => {
    setLoading(true);
    const arg = (period === 4 && range) ? range : (t.periodKeys[period] || 'month');
    api.getSummary(arg).then(setSummary).catch(() => setSummary(null)).finally(() => { setLoading(false); setFirstLoad(false); });
  }, [period, range, lang]);

  const d = summary || { total_sales: 0, order_count: 0, estimated_profit: 0, vat_collected: 0, top_items: [], sale_lines: [], payment_breakdown: {}, daily_chart: [], pending_po: 0, pending_service: 0, pending_quotation: 0 };
  const margin = d.total_sales > 0 ? ((d.estimated_profit / d.total_sales) * 100).toFixed(1) : '0.0';
  const chartDays = d.daily_chart || [];
  const chartMax  = Math.max(1, ...chartDays.map(c => c.total));
  const todayStr  = new Date().toISOString().slice(0, 10);
  // 1 บรรทัด = สินค้า 1 รายการในบิล 1 ใบ (เลขที่บิลซ้ำกันได้) ไม่รวมยอดข้ามบิลแล้ว
  // backend เวอร์ชันเก่าไม่มี sale_lines → ถอยไปใช้ top_items (รวมตามสินค้า) เหมือนเดิม
  const SALE_LINES_MAX = 10;
  const allLines   = d.sale_lines || d.top_items || [];
  const shownLines = allLines.slice(0, SALE_LINES_MAX);

  const payEntries = Object.entries(d.payment_breakdown || {});
  const payTotal   = payEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const PAY_COL = { cash: th.ok, qr: th.info, card: th.brandBg, mobile: th.warn };
  const PAY_LABEL = { cash: lang === 'th' ? 'เงินสด' : 'Cash', qr: lang === 'th' ? 'โอน / QR' : 'Transfer', card: lang === 'th' ? 'บัตรเครดิต' : 'Card', mobile: lang === 'th' ? 'Mobile' : 'Mobile' };

  const dLocale  = lang === 'th' ? 'th-TH' : 'en-GB';
  const dShort   = (v) => (v ? new Date(v).toLocaleDateString(dLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const rangeText  = range ? `${dShort(range.from)} – ${dShort(range.to)}` : t.custom;
  const periodLabel = (period === 4 && range) ? rangeText : t.periods[period];

  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'สรุปรายงาน' : 'Summary'} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loading && firstLoad} lang={lang} />

      {/* ช่วงเวลา (ชิป) + ส่งออกเป็นไฟล์ */}
      <View style={s.bar}>
        {t.periods.map((p, i) => (
          <Chip key={p} label={p} on={period === i} onPress={() => setPeriod(i)} />
        ))}
        <Chip label={rangeText} on={period === 4} onPress={() => setPick(range || { from: '', to: '' })} />
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printSummary(d, periodLabel)} style={s.exportBtn}>
          <MaterialCommunityIcons name="tray-arrow-down" size={sc(15)} color={th.brand} />
          <Text style={s.exportText}>{lang === 'th' ? 'ส่งออกเป็นไฟล์' : 'Export'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={th.brand} style={{ marginTop: 20 }} />}


        {/* KPI GRID */}
        <View style={s.kpiGrid}>
          <KPICard wide={wide} label={t.revenue} value={d.total_sales} icon="currency-usd" col={th.brandBg} bg={th.soft} />
          <KPICard wide={wide} label={t.orders} value={d.order_count} unit={t.unitPcs} icon="cart" col="#2e7d32" bg={th.okBg} />
          <KPICard wide={wide} label={t.profit} value={d.estimated_profit} sub={`${margin}% ${t.profitMargin}`} subUp={d.estimated_profit >= 0} icon="trending-up" col="#1a3a60" bg={th.infoBg} />
          <KPICard wide={wide} label={t.vatCollected} value={d.vat_collected} icon="receipt" col="#854F0B" bg={th.warnBg} />
        </View>

        <View style={[s.cols, !wide && s.colsNarrow]}>
        <View style={[s.colMain, !wide && s.colFull]}>

        {/* BAR CHART */}
        <View style={s.sec}>
          <Text style={s.secTitle}>{t.chartTitle}</Text>
          {chartDays.length === 0
            ? <Text style={s.emptyText}>{t.noData}</Text>
            : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 }}>
                {chartDays.map(c => {
                  const isToday = c.day === todayStr;
                  const barH = Math.max(2, Math.round((c.total / chartMax) * 72));
                  const dayLabel = new Date(c.day).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' });
                  return (
                    <View key={c.day} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                      <View style={{ width: '100%', borderRadius: 3, backgroundColor: isToday ? th.brandBg : '#f0d5d8', height: barH }} />
                      <Text style={[s.barLabel, { color: isToday ? th.brand : th.muted2, fontWeight: isToday ? '500' : '400' }]}>{dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            )
          }
        </View>

        {/* TOP SALES */}
        <View style={s.sec}>
          <Text style={s.secTitle}>{t.topSales}</Text>
          {shownLines.length === 0
            ? <Text style={s.emptyText}>{t.noData}</Text>
            : (<>
              {shownLines.map((item, i) => (
                <View key={`${item.sale_no || ''}:${item.sku}:${i}`} style={s.topRow}>
                  <View style={[s.rankBadge, { backgroundColor: i === 0 ? th.brandBg : i === 1 ? '#b87020' : th.softer }]}>
                    <Text style={[s.rankText, { color: i < 2 ? th.brandOn : th.muted2 }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.topName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.topSku}>{item.sku}</Text>
                  </View>
                  <Text style={s.topBill} numberOfLines={1}>{item.sale_no || '—'}</Text>
                  <Text style={s.topQty}>{item.qty}</Text>
                  <Text style={s.topAmt}>฿{fmtCp(item.amount)}</Text>
                </View>
              ))}
              {allLines.length > SALE_LINES_MAX && (
                <Text style={s.moreText}>{t.moreLines(allLines.length - SALE_LINES_MAX)}</Text>
              )}
            </>)
          }
        </View>

        </View>
        <View style={[s.colSide, !wide && s.colFull]}>

        {/* PAYMENT BREAKDOWN */}
        {payEntries.length > 0 && (
          <View style={s.sec}>
            <Text style={s.secTitle}>{t.payBreakdown}</Text>
            {payEntries.map(([key, val]) => {
              const pct = Math.round((val / payTotal) * 100);
              const col = PAY_COL[key] || '#555';
              return (
                <View key={key} style={{ marginBottom: 8 }}>
                  <View style={s.payLabelRow}>
                    <Text style={s.payLabel}>{PAY_LABEL[key] || key}</Text>
                    <Text style={[s.payLabel, { fontWeight: '500' }]}>{pct}%</Text>
                  </View>
                  <View style={s.payBar}>
                    <View style={[s.payBarFill, { width: `${pct}%`, backgroundColor: col }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* PENDING */}
        <View style={s.sec}>
          <Text style={s.secTitle}>{t.pendingSection}</Text>
          <View style={s.pendingGrid}>
            {[
              [t.pendingPO,  d.pending_po,        'truck-delivery', '#1a3a60', '#e0f0ff'],
              [t.pendingSrv, d.pending_service,    'tools',          '#854F0B', '#fff8e1'],
              [t.pendingQt,  d.pending_quotation,  'file-document',  '#550a19', '#fdf0f2'],
            ].map(([label, count, icon, col, bg]) => (
              <View key={label} style={[s.pendingCard, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={sc(18)} color={col} />
                <Text style={[s.pendingCount, { color: col }]}>{count ?? 0}</Text>
                <Text style={[s.pendingLabel, { color: col }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* กล่องเลือกช่วงวันที่ — มีผลทั้งหน้าจอและไฟล์ที่ส่งออก */}
      <ShellModal visible={!!pick} animationType="fade" transparent onRequestClose={() => setPick(null)}>
        <View style={s.overlay}>
          <View style={s.rangeBox}>
            <Text style={s.rangeTitle}>{t.pickRange}</Text>
            <Text style={s.rangeLabel}>{t.dFrom}</Text>
            <DateInput value={pick?.from} onChangeText={(v) => setPick(q => ({ ...q, from: v }))} placeholder="YYYY-MM-DD" style={s.rangeInput} />
            <Text style={s.rangeLabel}>{t.dTo}</Text>
            <DateInput value={pick?.to} onChangeText={(v) => setPick(q => ({ ...q, to: v }))} placeholder="YYYY-MM-DD" style={s.rangeInput} />
            <View style={s.rangeBtns}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setPick(null)} style={[s.rangeBtn, { backgroundColor: th.card2 }]}>
                <Text style={[s.rangeBtnText, { color: th.dim }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} disabled={!(pick?.from && pick?.to)}
                onPress={() => { setRange({ from: pick.from, to: pick.to }); setPeriod(4); setPick(null); }}
                style={[s.rangeBtn, { backgroundColor: (pick?.from && pick?.to) ? th.brandBg : '#d8c3c8' }]}>
                <Text style={[s.rangeBtnText, { color: th.brandOn }]}>{t.apply}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ShellModal>
    </View>
  );
}

const baseStyles = (th) => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', backgroundColor: th.card, borderBottomWidth: 1, borderBottomColor: th.line, paddingHorizontal: 14, paddingVertical: 11 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto', backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  exportText: { fontSize: 12, color: th.brand, fontWeight: '600' },
  cols:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  colMain: { flexGrow: 1.4, flexShrink: 1, flexBasis: 380, minWidth: 0 },
  colSide: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0 },
  colsNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  colFull:    { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', alignSelf: 'stretch' },
  kpiCardWide: { width: 'auto', flexGrow: 1, flexShrink: 1, flexBasis: 170, minWidth: 150 },
  periodTabs: { flexDirection: 'row', backgroundColor: th.card, borderBottomWidth: 1, borderBottomColor: th.line },
  periodTab:  { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodTabText: { fontSize: 11 },
  content:    { padding: 14, paddingBottom: 30 },
  kpiGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kpiCard:    { width: '48%', backgroundColor: th.card, borderRadius: 12, borderWidth: 1, borderColor: th.line, padding: 13 },
  kpiTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  kpiLabel:   { fontSize: 10, color: th.muted2, flex: 1 },
  kpiIcon:    { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  kpiVal:     { fontSize: 18, fontWeight: '500', color: th.ink },
  kpiSub:     { fontSize: 10, marginTop: 2 },
  sec:        { backgroundColor: th.card, borderRadius: 12, borderWidth: 1, borderColor: th.line, padding: 13, marginBottom: 10 },
  secTitle:   { fontSize: 11, fontWeight: '500', color: th.brand, letterSpacing: 1.5, marginBottom: 10 },
  emptyText:  { fontSize: 12, color: th.muted2, textAlign: 'center', paddingVertical: 10 },
  barLabel:   { fontSize: 9 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  rankBadge:  { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  rankText:   { fontSize: 10, fontWeight: '500' },
  topName:    { fontSize: 11, fontWeight: '500', color: th.ink },
  topSku:     { fontSize: 9, color: th.brand, marginTop: 1 },
  topBill:    { fontSize: 10, color: th.muted2, width: 72, textAlign: 'right' },
  topQty:     { fontSize: 12, color: th.ink, width: 30, textAlign: 'center' },
  topAmt:     { fontSize: 12, fontWeight: '500', color: th.brand, width: 60, textAlign: 'right' },
  moreText:   { fontSize: 10, color: th.muted2, textAlign: 'center', paddingTop: 4 },
  payLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  payLabel:   { fontSize: 11, color: th.dim },
  payBar:     { height: 6, backgroundColor: th.softer, borderRadius: 3, overflow: 'hidden' },
  payBarFill: { height: '100%', borderRadius: 3 },
  pendingGrid:{ flexDirection: 'row', gap: 8 },
  pendingCard:{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  pendingCount:{ fontSize: 22, fontWeight: '500' },
  pendingLabel:{ fontSize: 10, textAlign: 'center' },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  rangeBox:   { backgroundColor: th.card, borderRadius: 16, padding: 20, width: 300 },
  rangeTitle: { fontSize: 14, fontWeight: '600', color: th.brand, marginBottom: 12, textAlign: 'center' },
  rangeLabel: { fontSize: 11, color: th.muted2, marginBottom: 4 },
  rangeInput: { backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: th.ink, marginBottom: 10 },
  rangeBtns:  { flexDirection: 'row', gap: 10, marginTop: 6 },
  rangeBtn:   { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  rangeBtnText: { fontSize: 13, fontWeight: '500' },
});
