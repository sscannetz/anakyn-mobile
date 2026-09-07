// ══════════════════════════════════════════════════════
// HomeScreen.jsx — React Native version of AnakynHome
// ══════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { clearSession, getRole } from '../storage';

const STORE_KEY = 'anakyn_store_open';

const T = {
  th: {
    dateLabel: 'วันนี้', openStatus: 'เปิดร้านแล้ว', closedStatus: 'ปิดร้านแล้ว',
    todayLabel: 'ยอดขายวันนี้', stockLabel: 'สินค้าในสต๊อก', stockSub: 'รายการ',
    allLabel: 'สินค้าทั้งหมด', allSub: 'ชิ้น',
    profitLabel: 'กำไรเดือนนี้', profitSub: 'ก่อน VAT', profitSub2: 'รวม VAT',
    menuTitle: 'เมนูทั้งหมด',
    menus: [
      { emoji: '🛍️', label: 'บันทึกขาย',    sub: 'New Sale',       screen: 'Sale',          col: '#550a19', bg: '#fdf0f2' },
      { emoji: '💎', label: 'สต๊อกสินค้า',  sub: 'Stock',          screen: 'Stock',          col: '#534AB7', bg: '#f0eeff' },
      { emoji: '🧾', label: 'Invoice',       sub: 'ใบกำกับภาษี',   screen: 'Invoice',        col: '#1a5c28', bg: '#e8f5e9' },
      { emoji: '📋', label: 'ใบเสนอราคา',   sub: 'Quotation',      screen: 'Quotation',      col: '#1a3a60', bg: '#e0f0ff' },
      { emoji: '🚚', label: 'ใบสั่งซื้อ',   sub: 'Purchase Order', screen: 'PurchaseOrder',  col: '#854F0B', bg: '#fff8e1' },
      { emoji: '🔧', label: 'ใบสั่งซ่อม',   sub: 'Service Order',  screen: 'ServiceOrder',   col: '#7a1c2e', bg: '#fdf0f2' },
      { emoji: '📊', label: 'สรุปรายงาน',   sub: 'Summary',        screen: 'Summary',        col: '#2e7d32', bg: '#e8f5e9' },
      { emoji: '💵', label: 'ใบเสร็จรับเงิน', sub: 'Receipt',       screen: 'Receipt',        col: '#00695c', bg: '#e0f2f1' },
      { emoji: '👤', label: 'จัดการผู้ใช้', sub: 'Users',          screen: 'AddUser',        col: '#550a19', bg: '#fdf0f2', adminOnly: true },
    ],
    recentTitle: 'ขายล่าสุด',
    poTitle: 'PO ค้างอยู่', srvTitle: 'งานซ่อมค้าง',
    pendingLabel: 'รายการค้างอยู่',
    noSales: 'ยังไม่มีการขายวันนี้', noPending: 'ไม่มีรายการค้าง',
    due: 'นัดรับ', logout: 'ออกจากระบบ',
  },
  en: {
    dateLabel: 'Today', openStatus: 'Store open', closedStatus: 'Store closed',
    todayLabel: "Today's sales", stockLabel: 'Items in stock', stockSub: 'listings',
    allLabel: 'All items', allSub: 'pieces',
    profitLabel: 'Monthly profit', profitSub: 'before VAT', profitSub2: 'incl. VAT',
    menuTitle: 'All modules',
    menus: [
      { emoji: '🛍️', label: 'New Sale',       sub: 'บันทึกขาย',     screen: 'Sale',          col: '#550a19', bg: '#fdf0f2' },
      { emoji: '💎', label: 'Stock',          sub: 'สต๊อกสินค้า',   screen: 'Stock',          col: '#534AB7', bg: '#f0eeff' },
      { emoji: '🧾', label: 'Invoice',        sub: 'ใบกำกับภาษี',   screen: 'Invoice',        col: '#1a5c28', bg: '#e8f5e9' },
      { emoji: '📋', label: 'Quotation',      sub: 'ใบเสนอราคา',    screen: 'Quotation',      col: '#1a3a60', bg: '#e0f0ff' },
      { emoji: '🚚', label: 'Purchase Order', sub: 'ใบสั่งซื้อ',    screen: 'PurchaseOrder',  col: '#854F0B', bg: '#fff8e1' },
      { emoji: '🔧', label: 'Service Order',  sub: 'ใบสั่งซ่อม',    screen: 'ServiceOrder',   col: '#7a1c2e', bg: '#fdf0f2' },
      { emoji: '📊', label: 'Summary',        sub: 'สรุปรายงาน',    screen: 'Summary',        col: '#2e7d32', bg: '#e8f5e9' },
      { emoji: '💵', label: 'Receipt',        sub: 'ใบเสร็จรับเงิน', screen: 'Receipt',       col: '#00695c', bg: '#e0f2f1' },
      { emoji: '👤', label: 'Add User',       sub: 'จัดการผู้ใช้',  screen: 'AddUser',        col: '#550a19', bg: '#fdf0f2', adminOnly: true },
    ],
    recentTitle: 'Recent sales',
    poTitle: 'Pending PO', srvTitle: 'Pending Service',
    pendingLabel: 'Pending items',
    noSales: 'No sales today yet', noPending: 'No pending items',
    due: 'Due', logout: 'Log out',
  },
};

const fmt   = (n) => { const x = Number(n); return Math.round(Number.isFinite(x) ? x : 0).toLocaleString('th-TH'); };
const fmtCp = (n) => { n = Number(n); return n >= 1000 ? `฿${(n/1000).toFixed(0)}k` : `฿${fmt(n)}`; };

// payment_methods เก็บเป็น JSONB: [{ method, amount }]
const PAY_TH = { cash: 'เงินสด', qr: 'โอน/QR', transfer: 'โอน', card: 'บัตรเครดิต', other: 'อื่นๆ' };
function payLabel(pm) {
  let list = pm;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch (_) { list = []; } }
  if (!Array.isArray(list) || !list.length) return '—';
  return list.map(p => PAY_TH[p?.method] || p?.method || '—').join(' + ');
}

const POSTATUS_LABEL = { pending: 'รอส่ง', sent: 'ส่งแล้ว', received: 'รับแล้ว', cancelled: 'ยกเลิก' };
const POSTATUS_COL   = { pending: ['#fff8e1','#854F0B'], sent: ['#e0f0ff','#1a3a60'], received: ['#e8f5e9','#1a5c28'], cancelled: ['#f5f5f5','#666'] };
const SRVSTATUS_LABEL = { received: 'รับเรื่อง', repairing: 'กำลังซ่อม', qc: 'ตรวจสอบ', notified: 'แจ้งลูกค้า', picked_up: 'รับคืนแล้ว' };
const SRVSTATUS_COL   = { received: ['#fff8e1','#854F0B'], repairing: ['#e0f0ff','#1a3a60'], qc: ['#f0eeff','#3c3489'], notified: ['#fdf0f2','#7a1c2e'], picked_up: ['#e8f5e9','#1a5c28'] };

export default function HomeScreen({ navigation, route }) {
  const { styles, sc, center, menuItemWidth, menuGridStyle, menuIconStyle, menuEmojiSize } = useScaledStyles(baseStyles);
  const insets     = useSafeAreaInsets();
  // role มาจาก 2 ทาง: params (ตอนเพิ่งล็อกอิน) และ storage (ตอนรีเฟรชหน้า/เปิดแอปใหม่)
  // ถ้าอ่านจาก params อย่างเดียว พอกดรีเฟรชจะกลายเป็น staff แล้วเมนูของ admin หายไป
  const [userRole, setUserRole] = useState(route.params?.userRole || '');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (route.params?.userRole) { setUserRole(route.params.userRole); return; }
    getRole().then(r => setUserRole(r || 'staff')).catch(() => setUserRole('staff'));
  }, [route.params?.userRole]);

  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [storeOpen, setStoreOpen]       = useState(true);
  const [summary, setSummary]           = useState(null);
  const [recentSales, setRecentSales]   = useState([]);
  const [pendingPOs, setPendingPOs]     = useState([]);
  const [pendingSrvs, setPendingSrvs]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [saleDetail, setSaleDetail]     = useState(null);  // รายละเอียดบิลที่กดดู

  const [rcBusy, setRcBusy] = useState(false);

  // เปิดใบเสร็จ "ของบิลนี้" โดยตรง — ถ้ายังไม่เคยออก จะออกให้ก่อนแล้วค่อยเปิด
  const openReceiptForSale = async () => {
    const sale = saleDetail;
    if (!sale?.id || rcBusy) return;
    setRcBusy(true);
    try {
      const list = await api.getReceipts();
      let rc = (list || []).find(r => String(r.sale_id) === String(sale.id));
      if (!rc) {
        const payMap = { cash: 'cash', qr: 'transfer', transfer: 'transfer', card: 'card' };
        let pms = sale.payment_methods;
        if (typeof pms === 'string') { try { pms = JSON.parse(pms); } catch (_) { pms = []; } }
        const first = Array.isArray(pms) && pms[0]?.method;
        rc = await api.createReceipt({ sale_id: sale.id, payment_method: payMap[first] || 'other' });
      }
      setSaleDetail(null);
      navigation.navigate('Receipt', rc?.id ? { openReceiptId: rc.id } : undefined);
    } catch (e) {
      setSaleDetail(d => (d ? { ...d, error: e?.message || 'เปิดใบเสร็จไม่สำเร็จ' } : d));
    } finally {
      setRcBusy(false);
    }
  };

  // กดบิลในรายการ "ขายล่าสุด" → ดึงรายการสินค้าของบิลนั้นมาแสดง
  const openSale = async (row) => {
    setSaleDetail({ ...row, loading: true });
    try {
      const full = await api.getSale(row.id);
      // ใช้ค่าจาก row เป็นหลัก (มีชื่อลูกค้า/พนักงานที่ join มาแล้ว) แล้วเติม items จาก API
      setSaleDetail({ ...full, ...row, items: full.items || [], loading: false });
    } catch (e) {
      setSaleDetail({ ...row, loading: false, error: e?.message || 'โหลดรายละเอียดไม่สำเร็จ' });
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then(val => {
      if (val !== null) setStoreOpen(val === 'true');
    });
  }, []);

  const toggleStore = async () => {
    const next = !storeOpen;
    setStoreOpen(next);
    await AsyncStorage.setItem(STORE_KEY, String(next));
  };

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
              <MaterialCommunityIcons name="translate" size={sc(13)} color="#f5e0e5" />
              <Text style={styles.headerBtnText}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>{t.logout}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateStrip}>
          <Text style={styles.dateText}>{t.dateLabel} <Text style={styles.dateBold}>{todayStr}</Text></Text>
          <TouchableOpacity onPress={toggleStore} style={styles.openRow} activeOpacity={0.7}>
            <View style={[styles.statusDot, { backgroundColor: storeOpen ? '#7ec878' : '#e05c5c' }]} />
            <Text style={styles.dateBold}>{storeOpen ? t.openStatus : t.closedStatus}</Text>
            <MaterialCommunityIcons
              name={storeOpen ? 'toggle-switch' : 'toggle-switch-off'}
              size={sc(18)}
              color={storeOpen ? '#7ec878' : '#e05c5c'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, center]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#550a19" />}
      >
        {/* KPI */}
        <View style={styles.kpiMain}>
          <Text style={styles.kpiMainLabel}>{t.todayLabel}</Text>
          <Text style={styles.kpiMainValue}>{loading ? '—' : `฿${fmt(summary?.total_sales || 0)}`}</Text>
          <Text style={styles.kpiMainSub}>{loading ? '' : `${summary?.order_count || 0} รายการ`}</Text>
        </View>
        <View style={styles.kpiWrap}>
        <View style={[styles.kpiRow, styles.kpiFlexItem]}>
          {[
            [t.stockLabel, loading ? '—' : String(summary?.stock_count || 0), t.stockSub, '#534AB7', '#f0eeff', 'diamond-outline'],
            [t.allLabel,   loading ? '—' : fmt(summary?.total_pieces || 0),   t.allSub,   '#854F0B', '#fff8e1', 'package-variant-closed'],
          ].map(([label, val, sub, col, bg, icon]) => (
            <View key={label} style={styles.kpiCard}>
              <View style={styles.kpiCardTop}>
                <Text style={styles.kpiCardLabel}>{label}</Text>
                <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
                  <MaterialCommunityIcons name={icon} size={sc(13)} color={col} />
                </View>
              </View>
              <Text style={styles.kpiCardValue}>{val}</Text>
              <Text style={styles.kpiCardSub}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* กำไรเดือนนี้ — แสดงทั้งก่อน VAT และรวม VAT */}
        <View style={[styles.profitCard, styles.profitFlexItem]}>
          <View style={styles.kpiCardTop}>
            <Text style={styles.kpiCardLabel}>{t.profitLabel}</Text>
            <View style={[styles.kpiIcon, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="trending-up" size={sc(13)} color="#1a5c28" />
            </View>
          </View>
          <View style={styles.profitRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiCardValue}>
                {loading ? '—' : `฿${fmt(summary?.estimated_profit || 0)}`}
              </Text>
              <Text style={styles.kpiCardSub}>{t.profitSub}</Text>
            </View>
            <View style={styles.profitDivider} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kpiCardValue, { color: '#1a5c28' }]}>
                {loading ? '—' : `฿${fmt(summary?.profit_incl_vat ?? summary?.estimated_profit ?? 0)}`}
              </Text>
              <Text style={styles.kpiCardSub}>{t.profitSub2}</Text>
            </View>
          </View>
        </View>
        </View>

        {/* MENU GRID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.menuTitle}</Text>
          <View style={[styles.menuGrid, menuGridStyle]}>
            {visibleMenus.map(m => (
              <TouchableOpacity
                key={m.label}
                onPress={() => m.screen && navigation.navigate(m.screen)}
                style={[styles.menuItem, { width: menuItemWidth }]}
                activeOpacity={m.screen ? 0.7 : 1}
              >
                <View style={[styles.menuIcon, { backgroundColor: m.bg }, menuIconStyle]}>
                  <Text style={{ fontSize: menuEmojiSize }}>{m.emoji}</Text>
                </View>
                <Text style={[styles.menuLabel, { color: m.screen ? '#2c1015' : '#b09090' }]}>{m.label}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* RECENT SALES */}
        <Text style={styles.listTitle}>
          <MaterialCommunityIcons name="cart" size={sc(13)} color="#550a19" /> {t.recentTitle}
        </Text>
        {!loading && recentSales.length === 0 && (
          <Text style={styles.emptyText}>{t.noSales}</Text>
        )}
        {recentSales.map(s => (
          <TouchableOpacity key={s.id} onPress={() => openSale(s)} style={styles.listCard}>
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
          <MaterialCommunityIcons name="clock-outline" size={sc(13)} color="#550a19" /> {t.pendingLabel}
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
                <MaterialCommunityIcons name={p.icon} size={sc(18)} color={p.col} />
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

      {/* รายละเอียดบิลขาย */}
      <Modal visible={!!saleDetail} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setSaleDetail(null)}>
        <View style={styles.sdWrap}>
          <View style={styles.sdHead}>
            <View>
              <Text style={styles.sdNo}>{saleDetail?.sale_no || '—'}</Text>
              <Text style={styles.sdDate}>
                {saleDetail?.sold_at ? new Date(saleDetail.sold_at).toLocaleString('th-TH') : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSaleDetail(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>

          {saleDetail?.loading ? (
            <ActivityIndicator color="#550a19" style={{ marginTop: 24 }} />
          ) : (
            <ScrollView>
              {!!saleDetail?.error && (
                <View style={styles.sdErr}><Text style={styles.sdErrText}>{saleDetail.error}</Text></View>
              )}

              {/* ลูกค้า / พนักงาน */}
              <View style={styles.sdBox}>
                <View style={styles.sdRow}>
                  <Text style={styles.sdLabel}>ลูกค้า</Text>
                  <Text style={styles.sdValue}>{saleDetail?.customer_name || 'ไม่ระบุ'}</Text>
                </View>
                <View style={styles.sdRow}>
                  <Text style={styles.sdLabel}>พนักงานขาย</Text>
                  <Text style={styles.sdValue}>{saleDetail?.staff_name || '—'}</Text>
                </View>
                <View style={[styles.sdRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.sdLabel}>ชำระโดย</Text>
                  <Text style={styles.sdValue}>{payLabel(saleDetail?.payment_methods)}</Text>
                </View>
              </View>

              {/* รายการสินค้า */}
              <Text style={styles.sdSecTitle}>รายการสินค้า ({saleDetail?.items?.length || 0})</Text>
              {(saleDetail?.items || []).map((it, i) => (
                <View key={it.id || i} style={styles.sdItem}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sdItemName} numberOfLines={2}>{it.name || 'รายการ'}</Text>
                    <Text style={styles.sdItemSku}>{it.sku || ''}{it.qty > 1 ? ` × ${it.qty}` : ''}</Text>
                  </View>
                  <Text style={styles.sdItemAmt}>฿{fmt(it.line_total ?? it.unit_price)}</Text>
                </View>
              ))}
              {!saleDetail?.loading && !(saleDetail?.items || []).length && (
                <Text style={styles.sdEmpty}>ไม่พบรายการสินค้าในบิลนี้</Text>
              )}

              {/* ยอดรวม */}
              <View style={[styles.sdBox, { marginTop: 12 }]}>
                <View style={styles.sdRow}>
                  <Text style={styles.sdLabel}>ยอดรวมสินค้า</Text>
                  <Text style={styles.sdValue}>฿{fmt(saleDetail?.subtotal)}</Text>
                </View>
                {Number(saleDetail?.vip_discount) > 0 && (
                  <View style={styles.sdRow}>
                    <Text style={styles.sdLabel}>ส่วนลด VIP</Text>
                    <Text style={styles.sdValue}>−฿{fmt(saleDetail.vip_discount)}</Text>
                  </View>
                )}
                {Number(saleDetail?.extra_discount) > 0 && (
                  <View style={styles.sdRow}>
                    <Text style={styles.sdLabel}>ส่วนลดเพิ่ม</Text>
                    <Text style={styles.sdValue}>−฿{fmt(saleDetail.extra_discount)}</Text>
                  </View>
                )}
                <View style={styles.sdRow}>
                  <Text style={styles.sdLabel}>VAT</Text>
                  <Text style={styles.sdValue}>
                    {saleDetail?.vat_enabled === false ? 'ไม่มี' : `฿${fmt(saleDetail?.vat_amount)}`}
                  </Text>
                </View>
                <View style={[styles.sdRow, styles.sdTotalRow]}>
                  <Text style={styles.sdTotalLabel}>ยอดสุทธิ</Text>
                  <Text style={styles.sdTotalValue}>฿{fmt(saleDetail?.total)}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={openReceiptForSale} disabled={rcBusy}
                style={[styles.sdReceiptBtn, rcBusy && { opacity: 0.7 }]}>
                {rcBusy
                  ? <ActivityIndicator color="#fff5f7" size="small" />
                  : <MaterialCommunityIcons name="receipt" size={sc(17)} color="#fff5f7" />}
                <Text style={styles.sdReceiptText}>
                  {rcBusy ? 'กำลังเปิดใบเสร็จ...' : 'ใบเสร็จของบิลนี้'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = {
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
  openRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 30 },
  kpiMain: {
    backgroundColor: '#550a19', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  kpiMainLabel: { fontSize: 11, color: '#d4a0ac', marginBottom: 3 },
  kpiMainValue: { fontSize: 26, fontWeight: '500', color: '#fff5f7' },
  kpiMainSub:   { fontSize: 11, color: '#c090a0', marginTop: 3 },
  // กล่องครอบ KPI + กำไร — จอกว้างเรียงแถวเดียว จอแคบตัดบรรทัดเองอัตโนมัติ
  // ควบคุมจุดตัดด้วย minWidth ของลูก ไม่ต้องผูก breakpoint ตายตัว
  kpiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  kpiFlexItem:    { flex: 1, minWidth: 340, marginBottom: 0 },
  profitFlexItem: { flex: 1, minWidth: 380, marginBottom: 0 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10 },
  // การ์ดเดี่ยวเต็มความกว้าง — ห้ามใช้ flex:1 ของ kpiCard ไม่งั้นความสูงยุบเป็น 0
  profitCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10, marginBottom: 10 },
  profitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 2 },
  profitDivider: { width: 0.5, alignSelf: 'stretch', backgroundColor: '#e8d5d9' },
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

  // ── รายละเอียดบิลขาย ──
  sdWrap:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  sdHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sdNo:        { fontSize: 16, fontWeight: '700', color: '#550a19' },
  sdDate:      { fontSize: 11, color: '#a07080', marginTop: 2 },
  sdErr:       { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  sdErrText:   { fontSize: 12, color: '#a32d2d' },
  sdBox:       { borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, overflow: 'hidden' },
  sdRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  sdLabel:     { fontSize: 12, color: '#a07080' },
  sdValue:     { fontSize: 12.5, fontWeight: '600', color: '#2c1015', flexShrink: 1, textAlign: 'right' },
  sdTotalRow:  { borderBottomWidth: 0, backgroundColor: '#fdf0f2' },
  sdTotalLabel:{ fontSize: 13, fontWeight: '700', color: '#550a19' },
  sdTotalValue:{ fontSize: 16, fontWeight: '800', color: '#550a19' },
  sdSecTitle:  { fontSize: 11, fontWeight: '700', color: '#550a19', marginTop: 14, marginBottom: 6 },
  sdItem:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  sdItemName:  { fontSize: 12.5, fontWeight: '600', color: '#2c1015' },
  sdItemSku:   { fontSize: 10.5, color: '#a07080', marginTop: 1 },
  sdItemAmt:   { fontSize: 13, fontWeight: '700', color: '#550a19' },
  sdEmpty:     { fontSize: 11.5, color: '#a07080', textAlign: 'center', paddingVertical: 14 },
  sdReceiptBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 13, marginTop: 16 },
  sdReceiptText:{ fontSize: 14, fontWeight: '700', color: '#fff5f7' },
};
