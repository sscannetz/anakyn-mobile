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
import { api } from '../api';

const T = {
  th: {
    periods: ['วันนี้','สัปดาห์นี้','เดือนนี้','ปีนี้'],
    periodKeys: ['today','week','month','year'],
    revenue: 'รายได้รวม', orders: 'จำนวนออเดอร์',
    profit: 'กำไรสุทธิ', profitMargin: 'อัตรากำไร',
    vatCollected: 'VAT ที่เก็บได้',
    topSales: 'สินค้าขายดี', rank: '#', item: 'สินค้า', qty: 'จำนวน', amount: 'ยอด',
    payBreakdown: 'ช่องทางชำระเงิน',
    pendingSection: 'รายการค้างอยู่',
    pendingPO: 'PO ค้าง', pendingSrv: 'งานซ่อมค้าง', pendingQt: 'ใบเสนอราคา',
    chartTitle: 'ยอดขายรายวัน (7 วันล่าสุด)',
    noData: 'ไม่มีข้อมูล', loading: 'กำลังโหลด...',
  },
  en: {
    periods: ['Today','This week','This month','This year'],
    periodKeys: ['today','week','month','year'],
    revenue: 'Total revenue', orders: 'Orders',
    profit: 'Net profit', profitMargin: 'Margin',
    vatCollected: 'VAT collected',
    topSales: 'Top selling items', rank: '#', item: 'Item', qty: 'Qty', amount: 'Amount',
    payBreakdown: 'Payment breakdown',
    pendingSection: 'Pending items',
    pendingPO: 'Purchase orders', pendingSrv: 'Service orders', pendingQt: 'Quotations',
    chartTitle: 'Daily sales (last 7 days)',
    noData: 'No data', loading: 'Loading...',
  },
};

const fmt    = (n) => Math.round(Number(n)).toLocaleString('th-TH');
const fmtCp  = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(Math.round(n));

function KPICard({ label, value, sub, icon, col, bg, subUp }) {
  return (
    <View style={s.kpiCard}>
      <View style={s.kpiTop}>
        <Text style={s.kpiLabel}>{label}</Text>
        <View style={[s.kpiIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon} size={13} color={col} />
        </View>
      </View>
      <Text style={s.kpiVal}>฿{fmtCp(value)}</Text>
      {sub && (
        <Text style={[s.kpiSub, { color: subUp ? '#2e7d32' : '#c62828' }]}>
          {subUp ? '▲' : '▼'} {sub}
        </Text>
      )}
    </View>
  );
}

export default function SummaryScreen({ navigation }) {
  const insets  = useSafeAreaInsets();
  const [lang, setLang]   = useState('th');
  const [period, setPeriod] = useState(2);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = T[lang];

  useEffect(() => {
    setLoading(true);
    api.getSummary(t.periodKeys[period]).then(setSummary).catch(() => setSummary(null)).finally(() => setLoading(false));
  }, [period, lang]);

  const d = summary || { total_sales: 0, order_count: 0, estimated_profit: 0, vat_collected: 0, top_items: [], payment_breakdown: {}, daily_chart: [], pending_po: 0, pending_service: 0, pending_quotation: 0 };
  const margin = d.total_sales > 0 ? ((d.estimated_profit / d.total_sales) * 100).toFixed(1) : '0.0';
  const chartDays = d.daily_chart || [];
  const chartMax  = Math.max(1, ...chartDays.map(c => c.total));
  const todayStr  = new Date().toISOString().slice(0, 10);
  const payEntries = Object.entries(d.payment_breakdown || {});
  const payTotal   = payEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const PAY_COL = { cash: '#2e7d32', qr: '#1a3a60', card: '#550a19', mobile: '#854F0B' };
  const PAY_LABEL = { cash: lang === 'th' ? 'เงินสด' : 'Cash', qr: lang === 'th' ? 'โอน / QR' : 'Transfer', card: lang === 'th' ? 'บัตรเครดิต' : 'Card', mobile: lang === 'th' ? 'Mobile' : 'Mobile' };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'สรุปรายงาน' : 'Summary'} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />

      {/* PERIOD TABS */}
      <View style={s.periodTabs}>
        {t.periods.map((p, i) => (
          <TouchableOpacity key={p} onPress={() => setPeriod(i)}
            style={[s.periodTab, { borderBottomWidth: period === i ? 2 : 0, borderBottomColor: '#550a19' }]}>
            <Text style={[s.periodTabText, { color: period === i ? '#550a19' : '#a07080', fontWeight: period === i ? '500' : '400' }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}

        {/* KPI GRID */}
        <View style={s.kpiGrid}>
          <KPICard label={t.revenue} value={d.total_sales} icon="currency-usd" col="#550a19" bg="#fdf0f2" />
          <KPICard label={t.orders} value={d.order_count} icon="cart" col="#2e7d32" bg="#e8f5e9" />
          <KPICard label={t.profit} value={d.estimated_profit} sub={`${margin}% ${t.profitMargin}`} subUp={d.estimated_profit >= 0} icon="trending-up" col="#1a3a60" bg="#e0f0ff" />
          <KPICard label={t.vatCollected} value={d.vat_collected} icon="receipt" col="#854F0B" bg="#fff8e1" />
        </View>

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
                      <View style={{ width: '100%', borderRadius: 3, backgroundColor: isToday ? '#550a19' : '#f0d5d8', height: barH }} />
                      <Text style={[s.barLabel, { color: isToday ? '#550a19' : '#a07080', fontWeight: isToday ? '500' : '400' }]}>{dayLabel}</Text>
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
          {d.top_items.length === 0
            ? <Text style={s.emptyText}>{t.noData}</Text>
            : d.top_items.map((item, i) => (
              <View key={item.sku} style={s.topRow}>
                <View style={[s.rankBadge, { backgroundColor: i === 0 ? '#550a19' : i === 1 ? '#b87020' : '#f0e8f0' }]}>
                  <Text style={[s.rankText, { color: i < 2 ? '#fff' : '#a07080' }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.topName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.topSku}>{item.sku}</Text>
                </View>
                <Text style={s.topQty}>{item.qty}</Text>
                <Text style={s.topAmt}>฿{fmtCp(item.amount)}</Text>
              </View>
            ))
          }
        </View>

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
              [t.pendingQt,  d.pending_quotation,  'file-document',  '#534AB7', '#f0eeff'],
            ].map(([label, count, icon, col, bg]) => (
              <View key={label} style={[s.pendingCard, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={18} color={col} />
                <Text style={[s.pendingCount, { color: col }]}>{count ?? 0}</Text>
                <Text style={[s.pendingLabel, { color: col }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  periodTabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e8d5d9' },
  periodTab:  { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodTabText: { fontSize: 11 },
  content:    { padding: 14, paddingBottom: 30 },
  kpiGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kpiCard:    { width: '48%', backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10 },
  kpiTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  kpiLabel:   { fontSize: 10, color: '#a07080', flex: 1 },
  kpiIcon:    { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  kpiVal:     { fontSize: 18, fontWeight: '500', color: '#2c1015' },
  kpiSub:     { fontSize: 10, marginTop: 2 },
  sec:        { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 12, marginBottom: 10 },
  secTitle:   { fontSize: 11, fontWeight: '500', color: '#550a19', letterSpacing: 1.5, marginBottom: 10 },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 10 },
  barLabel:   { fontSize: 9 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#f9f4f5' },
  rankBadge:  { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  rankText:   { fontSize: 10, fontWeight: '500' },
  topName:    { fontSize: 11, fontWeight: '500', color: '#2c1015' },
  topSku:     { fontSize: 9, color: '#550a19', marginTop: 1 },
  topQty:     { fontSize: 12, color: '#2c1015', width: 30, textAlign: 'center' },
  topAmt:     { fontSize: 12, fontWeight: '500', color: '#550a19', width: 60, textAlign: 'right' },
  payLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  payLabel:   { fontSize: 11, color: '#806070' },
  payBar:     { height: 6, backgroundColor: '#f0e8e8', borderRadius: 3, overflow: 'hidden' },
  payBarFill: { height: '100%', borderRadius: 3 },
  pendingGrid:{ flexDirection: 'row', gap: 8 },
  pendingCard:{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  pendingCount:{ fontSize: 22, fontWeight: '500' },
  pendingLabel:{ fontSize: 10, textAlign: 'center' },
});
