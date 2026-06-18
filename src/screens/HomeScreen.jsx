// ══════════════════════════════════════════════════════
// HomeScreen.jsx — React Native version of AnakynHome
// ══════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api';
import { clearSession } from '../storage';

const T = {
  th: {
    dateLabel: 'วันนี้', openStatus: 'เปิดร้านแล้ว',
    todayLabel: 'ยอดขายวันนี้', stockLabel: 'สินค้าในสต๊อก', stockSub: 'ชิ้น',
    profitLabel: 'กำไรเดือนนี้', profitSub: 'ก่อน VAT',
    menuTitle: 'เมนูทั้งหมด',
    menus: [
      { emoji: '🛍️', label: 'บันทึกขาย',    sub: 'New Sale',       screen: 'Sale',          col: '#550a19', bg: '#fdf0f2' },
      { emoji: '💎', label: 'สต๊อกสินค้า',  sub: 'Stock',          screen: 'Stock',          col: '#534AB7', bg: '#f0eeff' },
      { emoji: '🧾', label: 'Invoice',       sub: 'ใบกำกับภาษี',   screen: 'Invoice',        col: '#1a5c28', bg: '#e8f5e9' },
      { emoji: '📋', label: 'ใบเสนอราคา',   sub: 'Quotation',      screen: 'Quotation',      col: '#1a3a60', bg: '#e0f0ff' },
      { emoji: '🚚', label: 'ใบสั่งซื้อ',   sub: 'Purchase Order', screen: 'PurchaseOrder',  col: '#854F0B', bg: '#fff8e1' },
      { emoji: '🔧', label: 'ใบสั่งซ่อม',   sub: 'Service Order',  screen: 'ServiceOrder',   col: '#7a1c2e', bg: '#fdf0f2' },
      { emoji: '📊', label: 'สรุปรายงาน',   sub: 'Summary',        screen: 'Summary',        col: '#2e7d32', bg: '#e8f5e9' },
      { emoji: '👤', label: 'จัดการผู้ใช้', sub: 'Users',          screen: 'AddUser',        col: '#550a19', bg: '#fdf0f2', adminOnly: true },
    ],
    recentTitle: 'ขายล่าสุด',
    poTitle: 'PO ค้างอยู่', srvTitle: 'งานซ่อมค้าง',
    pendingLabel: 'รายการค้างอยู่',
    noSales: 'ยังไม่มีการขายวันนี้', noPending: 'ไม่มีรายการค้าง',
    due: 'นัดรับ', logout: 'ออกจากระบบ',
  },
  en: {
    dateLabel: 'Today', openStatus: 'Store open',
    todayLabel: "Today's sales", stockLabel: 'Items in stock', stockSub: 'items',
    profitLabel: 'Monthly profit', profitSub: 'before VAT',
    menuTitle: 'All modules',
    menus: [
      { emoji: '🛍️', label: 'New Sale',       sub: 'บันทึกขาย',     screen: 'Sale',          col: '#550a19', bg: '#fdf0f2' },
      { emoji: '💎', label: 'Stock',          sub: 'สต๊อกสินค้า',   screen: 'Stock',          col: '#534AB7', bg: '#f0eeff' },
      { emoji: '🧾', label: 'Invoice',        sub: 'ใบกำกับภาษี',   screen: 'Invoice',        col: '#1a5c28', bg: '#e8f5e9' },
      { emoji: '📋', label: 'Quotation',      sub: 'ใบเสนอราคา',    screen: 'Quotation',      col: '#1a3a60', bg: '#e0f0ff' },
      { emoji: '🚚', label: 'Purchase Order', sub: 'ใบสั่งซื้อ',    screen: 'PurchaseOrder',  col: '#854F0B', bg: '#fff8e1' },
      { emoji: '🔧', label: 'Service Order',  sub: 'ใบสั่งซ่อม',    screen: 'ServiceOrder',   col: '#7a1c2e', bg: '#fdf0f2' },
      { emoji: '📊', label: 'Summary',        sub: 'สรุปรายงาน',    screen: 'Summary',        col: '#2e7d32', bg: '#e8f5e9' },
      { emoji: '👤', label: 'Add User',       sub: 'จัดการผู้ใช้',  screen: 'AddUser',        col: '#550a19', bg: '#fdf0f2', adminOnly: true },
    ],
    recentTitle: 'Recent sales',
    poTitle: 'Pending PO', srvTitle: 'Pending Service',
    pendingLabel: 'Pending items',
    noSales: 'No sales today yet', noPending: 'No pending items',
    due: 'Due', logout: 'Log out',
  },
};

const fmt   = (n) => Math.round(Number(n)).toLocaleString('th-TH');
const fmtCp = (n) => { n = Number(n); return n >= 1000 ? `฿${(n/1000).toFixed(0)}k` : `฿${fmt(n)}`; };

const POSTATUS_LABEL = { pending: 'รอส่ง', sent: 'ส่งแล้ว', received: 'รับแล้ว', cancelled: 'ยกเลิก' };
const POSTATUS_COL   = { pending: ['#fff8e1','#854F0B'], sent: ['#e0f0ff','#1a3a60'], received: ['#e8f5e9','#1a5c28'], cancelled: ['#f5f5f5','#666'] };
const SRVSTATUS_LABEL = { received: 'รับเรื่อง', repairing: 'กำลังซ่อม', qc: 'ตรวจสอบ', notified: 'แจ้งลูกค้า', picked_up: 'รับคืนแล้ว' };
const SRVSTATUS_COL   = { received: ['#fff8e1','#854F0B'], repairing: ['#e0f0ff','#1a3a60'], qc: ['#f0eeff','#3c3489'], notified: ['#fdf0f2','#7a1c2e'], picked_up: ['#e8f5e9','#1a5c28'] };

export default function HomeScreen({ navigation, route }) {
  const insets     = useSafeAreaInsets();
  const userRole   = route.params?.userRole || 'staff';
  const isAdmin    = userRole === 'admin';
  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [summary, setSummary]           = useState(null);
  const [recentSales, setRecentSales]   = useState([]);
  const [pendingPOs, setPendingPOs]     = useState([]);
  const [pendingSrvs, setPendingSrvs]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, sales, pos, services] = await Promise.all([
        api.getSummary('today'),
        api.getSales(3),
        api.getPurchaseOrders(),
        api.getServiceOrders(),
      ]);
      setSummary(sum);
      setRecentSales(sales);
      setPendingPOs(pos.filter(p => p.status === 'pending' || p.status === 'sent').slice(0, 2));
      setPendingSrvs(services.filter(s => s.status !== 'picked_up').slice(0, 2));
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  const visibleMenus = t.menus.filter(m => !m.adminOnly || isAdmin);

  const todayStr = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.logoText}>ANAKYN</Text>
            <Text style={styles.logoSub}>GEMS</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity onPress={() => setLang(l => l === 'th' ? 'en' : 'th')} style={styles.headerBtn}>
              <MaterialCommunityIcons name="translate" size={13} color="#f5e0e5" />
              <Text style={styles.headerBtnText}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>{t.logout}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateStrip}>
          <Text style={styles.dateText}>{t.dateLabel} <Text style={styles.dateBold}>{todayStr}</Text></Text>
          <View style={styles.openRow}>
            <View style={styles.greenDot} />
            <Text style={styles.dateBold}>{t.openStatus}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#550a19" />}
      >
        {/* KPI */}
        <View style={styles.kpiMain}>
          <Text style={styles.kpiMainLabel}>{t.todayLabel}</Text>
          <Text style={styles.kpiMainValue}>{loading ? '—' : `฿${fmt(summary?.total_sales || 0)}`}</Text>
          <Text style={styles.kpiMainSub}>{loading ? '' : `${summary?.order_count || 0} รายการ`}</Text>
        </View>
        <View style={styles.kpiRow}>
          {[
            [t.stockLabel,  loading ? '—' : String(summary?.stock_count || 0),   t.stockSub,  '#534AB7', '#f0eeff', 'diamond-outline'],
            [t.profitLabel, loading ? '—' : fmtCp(summary?.estimated_profit || 0), t.profitSub, '#1a5c28', '#e8f5e9', 'trending-up'],
          ].map(([label, val, sub, col, bg, icon]) => (
            <View key={label} style={styles.kpiCard}>
              <View style={styles.kpiCardTop}>
                <Text style={styles.kpiCardLabel}>{label}</Text>
                <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
                  <MaterialCommunityIcons name={icon} size={13} color={col} />
                </View>
              </View>
              <Text style={styles.kpiCardValue}>{val}</Text>
              <Text style={styles.kpiCardSub}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* MENU GRID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.menuTitle}</Text>
          <View style={styles.menuGrid}>
            {visibleMenus.map(m => (
              <TouchableOpacity
                key={m.label}
                onPress={() => m.screen && navigation.navigate(m.screen)}
                style={styles.menuItem}
                activeOpacity={m.screen ? 0.7 : 1}
              >
                <View style={[styles.menuIcon, { backgroundColor: m.bg }]}>
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                </View>
                <Text style={[styles.menuLabel, { color: m.screen ? '#2c1015' : '#b09090' }]}>{m.label}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* RECENT SALES */}
        <Text style={styles.listTitle}>
          <MaterialCommunityIcons name="cart" size={13} color="#550a19" /> {t.recentTitle}
        </Text>
        {!loading && recentSales.length === 0 && (
          <Text style={styles.emptyText}>{t.noSales}</Text>
        )}
        {recentSales.map(s => (
          <TouchableOpacity key={s.id} onPress={() => navigation.navigate('Sale')} style={styles.listCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listCardTitle}>{s.sale_no}</Text>
              <Text style={styles.listCardSub}>
                {new Date(s.sold_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} · {s.customer_name || 'ไม่ระบุ'}
              </Text>
            </View>
            <Text style={styles.listCardAmt}>฿{fmt(s.total)}</Text>
          </TouchableOpacity>
        ))}

        {/* PENDING COUNTS */}
        <Text style={styles.listTitle}>
          <MaterialCommunityIcons name="clock-outline" size={13} color="#550a19" /> {t.pendingLabel}
        </Text>
        <View style={styles.pendingRow}>
          {[
            { title: t.poTitle,  count: pendingPOs.length,   icon: 'truck-delivery', col: '#1a3a60', bg: '#e0f0ff', screen: 'PurchaseOrder' },
            { title: t.srvTitle, count: pendingSrvs.length,  icon: 'tools',          col: '#854F0B', bg: '#fff8e1', screen: 'ServiceOrder'  },
          ].map(p => (
            <TouchableOpacity key={p.title} onPress={() => navigation.navigate(p.screen)}
              style={[styles.pendingCard, { backgroundColor: p.bg }]}
            >
              <View style={[styles.pendingIcon, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                <MaterialCommunityIcons name={p.icon} size={18} color={p.col} />
              </View>
              <View>
                <Text style={[styles.pendingTitle, { color: p.col }]}>{p.title}</Text>
                <Text style={[styles.pendingCount, { color: p.col }]}>{loading ? '—' : p.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {!loading && pendingPOs.length === 0 && pendingSrvs.length === 0 && (
          <Text style={styles.emptyText}>{t.noPending}</Text>
        )}

        {pendingPOs.map(po => {
          const [bg, col] = POSTATUS_COL[po.status] || ['#f5f5f5', '#666'];
          return (
            <TouchableOpacity key={po.id} onPress={() => navigation.navigate('PurchaseOrder')} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listCardNo}>{po.po_no}</Text>
                <Text style={styles.listCardTitle}>{po.supplier_name || 'ไม่ระบุ'}</Text>
              </View>
              <View style={styles.listCardRight}>
                <Text style={styles.listCardAmt}>฿{fmt(po.total)}</Text>
                <View style={[styles.badge, { backgroundColor: bg }]}>
                  <Text style={[styles.badgeText, { color: col }]}>{POSTATUS_LABEL[po.status]}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {pendingSrvs.map(s => {
          const [bg, col] = SRVSTATUS_COL[s.status] || ['#f5f5f5', '#666'];
          return (
            <TouchableOpacity key={s.id} onPress={() => navigation.navigate('ServiceOrder')} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listCardNo}>{s.service_no}</Text>
                <Text style={styles.listCardTitle}>{s.product_name || '—'}</Text>
                <Text style={styles.listCardSub}>{s.customer_name || 'ไม่ระบุ'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: bg }]}>
                <Text style={[styles.badgeText, { color: col }]}>{SRVSTATUS_LABEL[s.status]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f4f5' },
  header: { backgroundColor: '#550a19' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  logoText: { fontSize: 18, fontWeight: '500', color: '#f5e8eb', letterSpacing: 2 },
  logoSub:  { fontSize: 8, color: '#d4a0ac', letterSpacing: 3 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  headerBtnText: { fontSize: 11, color: '#f0d0d8' },
  dateStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#3d0712', paddingHorizontal: 16, paddingVertical: 7,
  },
  dateText: { fontSize: 12, color: '#d4a0ac' },
  dateBold: { fontWeight: '600', color: '#f0d0d8' },
  openRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7ec878' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 30 },
  kpiMain: {
    backgroundColor: '#550a19', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  kpiMainLabel: { fontSize: 11, color: '#d4a0ac', marginBottom: 3 },
  kpiMainValue: { fontSize: 26, fontWeight: '500', color: '#fff5f7' },
  kpiMainSub:   { fontSize: 11, color: '#c090a0', marginTop: 3 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10 },
  kpiCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  kpiCardLabel: { fontSize: 10, color: '#a07080', flex: 1 },
  kpiIcon: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  kpiCardValue: { fontSize: 17, fontWeight: '500', color: '#2c1015' },
  kpiCardSub:   { fontSize: 10, color: '#b09090', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 12, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '500', color: '#a07080', letterSpacing: 1.5, marginBottom: 10 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  menuItem: { width: '24%', alignItems: 'center', padding: 6, borderRadius: 10 },
  menuIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  menuLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 14 },
  menuSub:   { fontSize: 9, color: '#c0a8b0', textAlign: 'center', lineHeight: 12 },
  listTitle: { fontSize: 12, fontWeight: '500', color: '#550a19', marginBottom: 8, marginTop: 4 },
  listCard: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9',
    padding: 10, marginBottom: 7, flexDirection: 'row', alignItems: 'center',
  },
  listCardTitle: { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  listCardSub:   { fontSize: 11, color: '#a07080', marginTop: 2 },
  listCardNo:    { fontSize: 10, fontWeight: '500', color: '#550a19', marginBottom: 1 },
  listCardAmt:   { fontSize: 14, fontWeight: '500', color: '#550a19', marginLeft: 8 },
  listCardRight: { alignItems: 'flex-end', gap: 4 },
  emptyText: { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 10 },
  pendingRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pendingCard: {
    flex: 1, borderRadius: 10, padding: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  pendingIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pendingTitle: { fontSize: 11, fontWeight: '500' },
  pendingCount: { fontSize: 20, fontWeight: '500' },
  badge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '500' },
});
