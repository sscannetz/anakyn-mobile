// ══════════════════════════════════════════════════════
// SummaryScreen.jsx — React Native version of AnakynSummary
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, ActivityIndicator,
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
    chartMonthly: 'ยอดขายรายเดือน (12 เดือนล่าสุด)',
    salesOf: 'ยอดขาย', vsPrev: 'เทียบช่วงก่อน', noPrev: 'ไม่มีข้อมูลช่วงก่อน',
    g3: 'เติบโต 3 เดือน', g6: 'เติบโต 6 เดือน', g12: 'เติบโต 1 ปี',
    pendingUnit: 'รายการ',
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
    chartMonthly: 'Monthly sales (last 12 months)',
    salesOf: 'Sales', vsPrev: 'vs previous period', noPrev: 'no previous data',
    g3: '3m growth', g6: '6m growth', g12: '1y growth',
    pendingUnit: 'items',
    noData: 'No data', loading: 'Loading...',
  },
};

const fmt    = (n) => { const x = Number(n); return Math.round(Number.isFinite(x) ? x : 0).toLocaleString('th-TH'); };
const fmtCp  = (n) => { n = Number(n); if (!Number.isFinite(n)) n = 0; return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(Math.round(n)); };

// % เปลี่ยนแปลงเทียบช่วงก่อน — ช่วงก่อนไม่มียอด = คิดไม่ได้ (null)
const pctChange = (cur, prev) => {
  const c = Number(cur) || 0, p = Number(prev) || 0;
  return p > 0 ? ((c - p) / p) * 100 : null;
};

// "▲ +18.2% เทียบช่วงก่อน" — ขึ้นเขียว ลงแดง
function Change({ pct, label, empty }) {
  const { styles: s, t: th } = useScaledStyles(baseStyles);
  if (pct === null || pct === undefined) return <Text style={s.cmpText}>— {empty}</Text>;
  const up = pct >= 0;
  return (
    <Text style={s.cmpText}>
      <Text style={{ color: up ? th.ok : th.danger, fontWeight: '600' }}>
        {up ? '+' : '−'}{Math.abs(pct).toFixed(1)}% {up ? '↑' : '↓'}
      </Text>
      {label ? `  ${label}` : ''}
    </Text>
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
  const [hoverBar, setHoverBar] = useState(null);   // แท่งที่เมาส์ชี้อยู่ (มือถือ = แท่งที่แตะ)
  const t = T[lang];

  useEffect(() => {
    setLoading(true);
    setHoverBar(null);
    const arg = (period === 4 && range) ? range : (t.periodKeys[period] || 'month');
    api.getSummary(arg).then(setSummary).catch(() => setSummary(null)).finally(() => { setLoading(false); setFirstLoad(false); });
  }, [period, range, lang]);

  const d = summary || { total_sales: 0, order_count: 0, estimated_profit: 0, vat_collected: 0, top_items: [], sale_lines: [], payment_breakdown: {}, daily_chart: [], pending_po: 0, pending_service: 0, pending_quotation: 0 };
  const margin = d.total_sales > 0 ? ((d.estimated_profit / d.total_sales) * 100).toFixed(1) : '0.0';
  const prev   = d.prev || {};
  const growth = d.growth || {};
  // ปีนี้ → แท่งรายเดือน 12 แท่ง · ช่วงอื่น → แท่งรายวัน 7 วันล่าสุด (backend เก่าไม่มีรายเดือน → ถอยไปรายวัน)
  const useMonthly = period === 3 && Array.isArray(d.monthly_chart) && d.monthly_chart.length > 0;
  const bars = useMonthly
    ? d.monthly_chart.map(c => ({ key: c.month, total: c.total,
        label: new Date(`${c.month}-01T00:00:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short' }) }))
    : (d.daily_chart || []).map(c => ({ key: c.day, total: c.total,
        label: new Date(c.day).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' }) }));
  const chartMax = Math.max(1, ...bars.map(c => c.total));
  const chartH   = wide ? 240 : 180;
  const barArea  = chartH - 52;   // เผื่อป้ายชื่อเดือน/วันด้านล่าง + ป้ายยอดเหนือแท่ง
  const pendingTotal = (Number(d.pending_po) || 0) + (Number(d.pending_service) || 0) + (Number(d.pending_quotation) || 0);
  // 1 บรรทัด = สินค้า 1 รายการในบิล 1 ใบ (เลขที่บิลซ้ำกันได้) ไม่รวมยอดข้ามบิลแล้ว
  // backend เวอร์ชันเก่าไม่มี sale_lines → ถอยไปใช้ top_items (รวมตามสินค้า) เหมือนเดิม
  const SALE_LINES_MAX = 10;
  const allLines   = d.sale_lines || d.top_items || [];
  const shownLines = allLines.slice(0, SALE_LINES_MAX);

  const payEntries = Object.entries(d.payment_breakdown || {});
  const payTotal   = payEntries.reduce((s, [, v]) => s + v, 0) || 1;
  // ไล่เฉดสีแบรนด์ เข้ม → อ่อน ตามลำดับแถบ
  const PAY_SHADE = [th.brandBg, th.brand2, th.line3, th.line2];
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


        {/* KPI — กล่องเดียวแบ่งช่อง */}
        <View style={s.kpiStrip}>
          {[
            [t.revenue, `฿${fmt(d.total_sales)}`, <Change pct={pctChange(d.total_sales, prev.total_sales)} label={t.vsPrev} empty={t.noPrev} />],
            [t.orders, <Text>{fmt(d.order_count)}<Text style={s.kpiUnit}>  {t.unitPcs}</Text></Text>, <Change pct={pctChange(d.order_count, prev.order_count)} label={t.vsPrev} empty={t.noPrev} />],
            [t.profit, `฿${fmt(d.estimated_profit)}`, <Text style={s.cmpText}><Text style={{ color: d.estimated_profit >= 0 ? th.ok : th.danger, fontWeight: '600' }}>{margin}%</Text>  {t.profitMargin}</Text>],
            [t.vatCollected, `฿${fmt(d.vat_collected)}`, <Change pct={pctChange(d.vat_collected, prev.vat_collected)} label={t.vsPrev} empty={t.noPrev} />],
          ].map(([label, val, cmp], i) => (
            <View key={label} style={[s.kpiCell, { width: wide ? '25%' : '50%' },
              (wide ? i > 0 : i % 2 === 1) && s.kpiCellL, (!wide && i >= 2) && s.kpiCellT]}>
              <Text style={s.kpiLabel}>{label}</Text>
              <Text style={[s.kpiVal, !wide && { fontSize: sc(19) }]} numberOfLines={1} adjustsFontSizeToFit>{val}</Text>
              {cmp}
            </View>
          ))}
        </View>

        {/* ยอดขาย + กราฟแท่งใหญ่ */}
        <View style={s.card}>
          <View style={s.revTop}>
            <View style={{ flexShrink: 1 }}>
              <Text style={s.cardLabel}>{t.salesOf} · {periodLabel}</Text>
              <Text style={[s.revVal, !wide && { fontSize: sc(26) }]}>฿{fmt(d.total_sales)}</Text>
              <Change pct={pctChange(d.total_sales, prev.total_sales)} label={t.vsPrev} empty={t.noPrev} />
            </View>
            <View style={s.growthRow}>
              {[[t.g3, growth.m3], [t.g6, growth.m6], [t.g12, growth.m12]].map(([label, g]) => {
                const pc = g ? pctChange(g.cur, g.prev) : null;
                return (
                  <View key={label} style={s.growthBox}>
                    <Text style={s.growthLabel}>{label}</Text>
                    <Text style={[s.growthVal, { color: pc === null ? th.muted : pc >= 0 ? th.ok : th.danger }]}>
                      {pc === null ? '—' : `${pc >= 0 ? '+' : '−'}${Math.abs(pc).toFixed(0)}% ${pc >= 0 ? '↑' : '↓'}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={[s.cardLabel, { marginTop: 16 }]}>{useMonthly ? t.chartMonthly : t.chartTitle}</Text>
          {bars.length === 0
            ? <Text style={s.emptyText}>{t.noData}</Text>
            : (
              <View style={[s.chart, { height: chartH, gap: wide ? 10 : 5 }]}>
                {bars.map((c, i) => {
                  const last = bars.length - 1;
                  const hi = i === last;   // แท่งสุดท้าย = วันนี้ / เดือนนี้
                  const hov = hoverBar === i;
                  // ป้ายยอด: แท่งที่ชี้อยู่ · ไม่ได้ชี้แท่งไหน → แท่งปัจจุบัน (ถ้ามียอด)
                  const showTip = hoverBar !== null ? hov : (hi && c.total > 0);
                  const barH = Math.max(4, Math.round((c.total / chartMax) * barArea));
                  return (
                    <Pressable key={c.key} style={s.chartCol}
                      onHoverIn={() => setHoverBar(i)}
                      onHoverOut={() => setHoverBar(h => (h === i ? null : h))}
                      onPress={() => setHoverBar(i)}>
                      {showTip && (
                        // แท่งริมซ้าย/ขวา ป้ายชิดขอบด้านใน ไม่ให้ล้นการ์ด
                        <View style={[s.tip, { alignSelf: i === 0 ? 'flex-start' : i === last ? 'flex-end' : 'center' }]}>
                          <Text style={s.tipText} numberOfLines={1}>฿{fmt(c.total)}</Text>
                        </View>
                      )}
                      <View style={[s.chartBar, { height: barH, borderRadius: wide ? 14 : 8 },
                        hov ? s.chartBarHover : hi ? s.chartBarHi : (c.total === 0 && { opacity: 0.5 })]} />
                      <Text style={[s.barLabel, (hi || hov) && { color: th.brand, fontWeight: '700' }]} numberOfLines={1}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )
          }
        </View>

        <View style={[s.row2, !wide && { flexDirection: 'column' }]}>
          {/* ช่องทางชำระเงิน — แถบแนวนอน */}
          <View style={[s.card, s.row2Main]}>
            <Text style={s.cardLabel}>{t.payBreakdown}</Text>
            <Text style={s.bigNum}>{fmt(d.order_count)}<Text style={s.bigUnit}>  {t.unitPcs}</Text></Text>
            {payEntries.length === 0
              ? <Text style={s.emptyText}>{t.noData}</Text>
              : payEntries.map(([key, val], i) => {
                const pct = Math.round((val / payTotal) * 100);
                return (
                  <View key={key} style={s.hbRow}>
                    <Text style={s.hbLabel} numberOfLines={1}>{PAY_LABEL[key] || key}</Text>
                    <View style={s.hbTrack}>
                      <View style={[s.hbFill, { width: `${pct}%`, backgroundColor: PAY_SHADE[i % PAY_SHADE.length] }]} />
                    </View>
                    <Text style={s.hbPct}>{pct}%</Text>
                  </View>
                );
              })}
          </View>

          {/* รายการค้าง */}
          <View style={[s.card, s.row2Side]}>
            <Text style={s.cardLabel}>{t.pendingSection}</Text>
            <Text style={s.bigNum}>{fmt(pendingTotal)}<Text style={s.bigUnit}>  {t.pendingUnit}</Text></Text>
            <View style={s.pendingGrid}>
              {[
                [t.pendingPO,  d.pending_po,        'truck-delivery'],
                [t.pendingSrv, d.pending_service,   'tools'],
                [t.pendingQt,  d.pending_quotation, 'file-document'],
              ].map(([label, count, icon]) => (
                <View key={label} style={s.pendingCard}>
                  <MaterialCommunityIcons name={icon} size={sc(16)} color={th.brand} />
                  <Text style={s.pendingCount}>{fmt(count)}</Text>
                  <Text style={s.pendingLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* สินค้าขายดี */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{t.topSales}</Text>
          {shownLines.length === 0
            ? <Text style={s.emptyText}>{t.noData}</Text>
            : (<>
              {shownLines.map((item, i) => (
                <View key={`${item.sale_no || ''}:${item.sku}:${i}`} style={s.topRow}>
                  <View style={[s.rankBadge, { backgroundColor: i === 0 ? th.brandBg : th.softer }]}>
                    <Text style={[s.rankText, { color: i === 0 ? th.brandOn : th.muted2 }]}>{i + 1}</Text>
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
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => navigation.navigate('Receipt')} style={s.moreBtn}>
                  <Text style={s.moreLink}>{t.moreLines(allLines.length - SALE_LINES_MAX)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={sc(14)} color={th.brand} />
                </TouchableOpacity>
              )}
            </>)
          }
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
  periodTabs: { flexDirection: 'row', backgroundColor: th.card, borderBottomWidth: 1, borderBottomColor: th.line },
  periodTab:  { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodTabText: { fontSize: 11 },
  content:    { padding: 14, paddingBottom: 30, gap: 12, width: '100%', maxWidth: 1180 },
  kpiStrip:   { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 16, overflow: 'hidden' },
  kpiCell:    { paddingHorizontal: 16, paddingVertical: 15 },
  kpiCellL:   { borderLeftWidth: 1, borderLeftColor: th.line },
  kpiCellT:   { borderTopWidth: 1, borderTopColor: th.line },
  kpiLabel:   { fontSize: 12, color: th.muted },
  kpiVal:     { fontSize: 24, fontWeight: '600', color: th.ink, marginTop: 6, marginBottom: 12, fontVariant: ['tabular-nums'] },
  kpiUnit:    { fontSize: 13, fontWeight: '400', color: th.muted },
  cmpText:    { fontSize: 11.5, color: th.muted },
  card:       { backgroundColor: th.card, borderRadius: 16, borderWidth: 1, borderColor: th.line, paddingHorizontal: 16, paddingVertical: 15 },
  cardLabel:  { fontSize: 12, color: th.muted, marginBottom: 2 },
  revTop:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  revVal:     { fontSize: 32, fontWeight: '600', color: th.ink, marginVertical: 4, fontVariant: ['tabular-nums'] },
  growthRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  growthBox:  { backgroundColor: th.soft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 8, minWidth: 104 },
  growthLabel:{ fontSize: 11, color: th.muted2 },
  growthVal:  { fontSize: 14, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  chart:      { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
  chartCol:   { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 },
  chartBar:   { width: '100%', backgroundColor: th.line2, borderWidth: 1, borderColor: th.line3 },
  chartBarHi: { backgroundColor: th.brandBg, borderColor: th.brandBg },
  chartBarHover: { backgroundColor: th.danger, borderColor: th.danger, opacity: 0.45 },   // แดงอ่อน (โหมดขาวดำ = เทา)
  barLabel:   { fontSize: 10.5, color: th.muted2 },
  tip:        { backgroundColor: th.ink, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, marginBottom: 2 },
  tipText:    { fontSize: 10.5, color: th.card, fontWeight: '600' },
  row2:       { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  row2Main:   { flexGrow: 1.25, flexShrink: 1, flexBasis: 0 },
  row2Side:   { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bigNum:     { fontSize: 26, fontWeight: '600', color: th.ink, fontVariant: ['tabular-nums'] },
  bigUnit:    { fontSize: 12.5, fontWeight: '400', color: th.muted },
  hbRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  hbLabel:    { width: 84, fontSize: 12, color: th.muted2 },
  hbTrack:    { flex: 1, height: 20, borderRadius: 10, backgroundColor: th.softer, overflow: 'hidden' },
  hbFill:     { height: '100%', borderRadius: 10 },
  hbPct:      { width: 42, fontSize: 12, color: th.ink, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pendingGrid:{ flexDirection: 'row', gap: 8, marginTop: 14 },
  pendingCard:{ flex: 1, borderRadius: 12, padding: 11, backgroundColor: th.soft, gap: 3 },
  pendingCount:{ fontSize: 22, fontWeight: '600', color: th.brand },
  pendingLabel:{ fontSize: 11, color: th.muted2 },
  emptyText:  { fontSize: 12, color: th.muted2, textAlign: 'center', paddingVertical: 10 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  rankBadge:  { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  rankText:   { fontSize: 10, fontWeight: '500' },
  topName:    { fontSize: 11, fontWeight: '500', color: th.ink },
  topSku:     { fontSize: 9, color: th.brand, marginTop: 1 },
  topBill:    { fontSize: 10, color: th.muted2, width: 72, textAlign: 'right' },
  topQty:     { fontSize: 12, color: th.ink, width: 30, textAlign: 'center' },
  topAmt:     { fontSize: 12, fontWeight: '500', color: th.brand, width: 60, textAlign: 'right' },
  moreBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, alignSelf: 'center', paddingTop: 6, paddingHorizontal: 10, paddingBottom: 2 },
  moreLink:   { fontSize: 11.5, color: th.brand, fontWeight: '600', textDecorationLine: 'underline' },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  rangeBox:   { backgroundColor: th.card, borderRadius: 16, padding: 20, width: 300 },
  rangeTitle: { fontSize: 14, fontWeight: '600', color: th.brand, marginBottom: 12, textAlign: 'center' },
  rangeLabel: { fontSize: 11, color: th.muted2, marginBottom: 4 },
  rangeInput: { backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: th.ink, marginBottom: 10 },
  rangeBtns:  { flexDirection: 'row', gap: 10, marginTop: 6 },
  rangeBtn:   { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  rangeBtnText: { fontSize: 13, fontWeight: '500' },
});
