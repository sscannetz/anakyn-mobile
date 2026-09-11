// ══════════════════════════════════════════════════════
// HomeScreen.jsx — React Native version of AnakynHome
// ══════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, Image,
  Platform, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { clearSession, getRole } from '../storage';
import { LOGO_URI } from '../logoBase64';
import ConnectingBar from '../components/ConnectingBar';
import Header from '../components/Header';
import { SHELL_BP } from '../components/AppShell';
import { openDrawer } from '../navRef';
import {
  useWide, Panel, TableHead, TableRow, TdNo, TdMain, TdAmt, Empty,
} from '../components/DataPanel';

const T = {
  th: {
    dateLabel: 'วันนี้',
    todayLabel: 'ยอดขายวันนี้', stockLabel: 'สินค้าในสต๊อก', stockSub: 'รายการ',
    allLabel: 'สินค้าทั้งหมด', allSub: 'ชิ้น',
    profitLabel: 'กำไรเดือนนี้', profitSub: 'ก่อน VAT', profitSub2: 'รวม VAT',
    menuTitle: 'เมนูทั้งหมด',
    overviewTitle: 'ภาพรวมวันนี้',
    lowStockTitle: 'สินค้าใกล้หมด',
    lowStockSub: (n) => `เหลือ ${n} ชิ้น`,
    noLowStock: 'สต๊อกยังพอทุกรายการ',
    seeAll: 'ดูทั้งหมด',
    seeLess: 'ย่อลง',
    menus: [
      { emoji: '🛍️', label: 'บันทึกขาย',    sub: 'New Sale',       screen: 'Sale',          col: '#550a19', bg: '#fdf0f2' },
      { emoji: '🏷️', label: 'สต๊อกสินค้า',  sub: 'Stock',          screen: 'Inventory',      col: '#550a19', bg: '#fdf0f2' },
      { emoji: '💎', label: 'เพิ่มสต๊อกสินค้า', sub: 'Add Stock',   screen: 'Stock',          col: '#550a19', bg: '#fdf0f2' },
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
    dateLabel: 'Today',
    todayLabel: "Today's sales", stockLabel: 'Items in stock', stockSub: 'listings',
    allLabel: 'All items', allSub: 'pieces',
    profitLabel: 'Monthly profit', profitSub: 'before VAT', profitSub2: 'incl. VAT',
    menuTitle: 'All modules',
    overviewTitle: "Today's overview",
    lowStockTitle: 'Low stock',
    lowStockSub: (n) => `${n} left`,
    noLowStock: 'Stock levels are fine',
    seeAll: 'See all',
    seeLess: 'Show less',
    menus: [
      { emoji: '🛍️', label: 'New Sale',       sub: 'บันทึกขาย',     screen: 'Sale',          col: '#550a19', bg: '#fdf0f2' },
      { emoji: '🏷️', label: 'Stock',          sub: 'สต๊อกสินค้า',   screen: 'Inventory',      col: '#550a19', bg: '#fdf0f2' },
      { emoji: '💎', label: 'Add Stock',      sub: 'เพิ่มสต๊อกสินค้า', screen: 'Stock',       col: '#550a19', bg: '#fdf0f2' },
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
const POSTATUS_COL   = { pending: ['#fdf0f2','#8c1b2f'], sent: ['#fdf0f2','#8c1b2f'], received: ['#ffffff','#9b7d86'], cancelled: ['#ffffff','#c0a8ae'] };
const SRVSTATUS_LABEL = { received: 'รับเรื่อง', repairing: 'กำลังซ่อม', qc: 'ตรวจสอบ', notified: 'แจ้งลูกค้า', picked_up: 'รับคืนแล้ว' };
const SRVSTATUS_COL   = { received: ['#fdf0f2','#8c1b2f'], repairing: ['#fdf0f2','#8c1b2f'], qc: ['#fdf0f2','#8c1b2f'], notified: ['#fdf0f2','#8c1b2f'], picked_up: ['#ffffff','#9b7d86'] };

const SALE_COLS = [
  { label: 'เลขที่บิล', w: 130 },
  { label: 'เวลา', w: 60 },
  { label: 'ลูกค้า' },
  { label: 'ช่องทาง', w: 120 },
  { label: 'ยอด', w: 95, rt: true },
];

export default function HomeScreen({ navigation, route }) {
  const { styles, sc, center, menuItemStyle, menuGridStyle, menuIconStyle, menuEmojiSize } = useScaledStyles(baseStyles);
  const insets     = useSafeAreaInsets();
  const { width }  = useWindowDimensions();
  // จอกว้าง: เมนูอยู่แถบซ้ายแล้ว ไม่ต้องมีตารางเมนูซ้ำในหน้านี้
  const hasSide    = Platform.OS === 'web' && width >= SHELL_BP;
  // จอกว้างพอจะวางสองคอลัมน์ได้
  const wideHome   = useWide(1000);
  // ขายล่าสุด: โชว์ 5 บิลก่อน กด "ดูทั้งหมด" แล้วค่อยขยาย
  const SALES_PREVIEW = 5;
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

  const [summary, setSummary]           = useState(null);
  const [recentSales, setRecentSales]   = useState([]);
  const [lowStock, setLowStock]         = useState([]);
  const [showAllSales, setShowAllSales] = useState(false);
  const [pendingPOs, setPendingPOs]     = useState([]);
  const [pendingSrvs, setPendingSrvs]   = useState([]);
  const [loading, setLoading]           = useState(true);
  // แถบ "กำลังเชื่อมต่อ" โชว์เฉพาะการโหลดรอบแรกหลังเปิด/รีเฟรชหน้า
  // (Render free tier หลับหลังไม่มี traffic ~15 นาที ตื่นครั้งแรกใช้เวลา 30-60 วิ)
  // รอบถัด ๆ ไปเซิร์ฟเวอร์ตื่นแล้ว โหลดไวมาก ถ้าโชว์ทุกครั้งจะกะพริบกวนตา
  const [firstLoad, setFirstLoad]       = useState(true);
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

  const loadData = useCallback(async () => {
    try {
      const [sum, sales, pos, services, products] = await Promise.all([
        api.getSummary('today'),
        api.getSales(20),
        api.getPurchaseOrders(),
        api.getServiceOrders(),
        api.getProducts({ light: 'true' }).catch(() => []),
      ]);
      setSummary(sum);
      setRecentSales(sales);
      // สินค้าใกล้หมด — เหลือไม่เกิน 2 ชิ้น เรียงจากน้อยไปมาก
      setLowStock(
        (Array.isArray(products) ? products : [])
          .filter(pr => pr.stock_qty != null && Number(pr.stock_qty) <= 2)
          .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty))
          .slice(0, 6)
      );
      setPendingPOs(pos.filter(p => p.status === 'pending' || p.status === 'sent').slice(0, 2));
      setPendingSrvs(services.filter(s => s.status !== 'picked_up').slice(0, 2));
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
    setFirstLoad(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  const visibleMenus = t.menus.filter(m => !m.adminOnly || isAdmin);
  const visibleSales = showAllSales ? recentSales : recentSales.slice(0, SALES_PREVIEW);

  const todayStr = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Header
        title={t.overviewTitle}
        subtitle={todayStr}
        lang={lang}
        onLangToggle={() => setLang(l => (l === 'th' ? 'en' : 'th'))}
        rightComponent={
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        }
      />

      <ConnectingBar visible={loading && firstLoad} lang={lang} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, center]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#550a19" />}
      >
        {wideHome ? (
          <>
            {/* ตัวเลขสรุป 4 ช่อง — ช่องแรกเป็นบล็อกแดงเดียวของหน้า */}
            <View style={styles.tiles}>
              <View dataSet={{ hov: 'dark' }} style={[styles.tile, styles.tileLead]}>
                <Text style={styles.tileLeadLabel}>{t.todayLabel}</Text>
                <Text style={styles.tileLeadValue}>{loading ? '—' : `฿${fmt(summary?.total_sales || 0)}`}</Text>
                <Text style={styles.tileLeadSub}>
                  {loading ? '' : `${summary?.order_count || 0} ${lang === 'th' ? 'บิล' : 'orders'}`}
                </Text>
              </View>
              <View dataSet={{ hov: 'card' }} style={styles.tile}>
                <Text style={styles.tileLabel}>{t.profitLabel} ({t.profitSub})</Text>
                <Text style={styles.tileValue}>{loading ? '—' : `฿${fmt(summary?.estimated_profit || 0)}`}</Text>
                <Text style={styles.tileSub}>
                  {loading ? '' : `${t.profitSub2} ฿${fmt(summary?.profit_incl_vat ?? summary?.estimated_profit ?? 0)}`}
                </Text>
              </View>
              <TouchableOpacity dataSet={{ hov: 'card' }} onPress={() => navigation.navigate('Inventory')} style={styles.tile}>
                <Text style={styles.tileLabel}>{t.stockLabel}</Text>
                <Text style={styles.tileValue}>{loading ? '—' : String(summary?.stock_count || 0)}</Text>
                <Text style={styles.tileSub}>{loading ? '' : `${fmt(summary?.total_pieces || 0)} ${t.allSub}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'card' }} onPress={() => navigation.navigate('ServiceOrder')} style={styles.tile}>
                <Text style={styles.tileLabel}>{t.pendingLabel}</Text>
                <Text style={[styles.tileValue, { color: '#550a19' }]}>
                  {loading ? '—' : pendingPOs.length + pendingSrvs.length}
                </Text>
                <Text style={styles.tileSub}>PO {pendingPOs.length} · {t.srvTitle} {pendingSrvs.length}</Text>
              </TouchableOpacity>
            </View>

            {/* ทางลัด */}
            <View style={styles.quickRow}>
              {[
                ['บันทึกขายใหม่',       'plus',            'Sale'],
                ['เพิ่มสินค้าเข้าสต๊อก', 'diamond-outline', 'Stock'],
                ['ปริ้นป้ายสินค้า',     'printer-outline', 'Inventory'],
                ['ออกใบเสร็จ',         'cash-multiple',   'Receipt'],
              ].map(([label, icon, screen], i) => (
                <TouchableOpacity dataSet={{ hov: 'btn' }}
                  key={screen}
                  onPress={() => navigation.navigate(screen)}
                  style={[styles.quickBtn, i === 0 && styles.quickBtnPri]}
                >
                  <MaterialCommunityIcons name={icon} size={sc(15)} color={i === 0 ? '#fff5f7' : '#550a19'} />
                  <Text style={[styles.quickText, i === 0 && { color: '#fff5f7' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* สองคอลัมน์: ตารางขายล่าสุด + แถบงานที่ต้องจัดการ */}
            <View style={styles.cols}>
              <View style={styles.colMain}>
                <Panel title={t.recentTitle}
                  right={recentSales.length > SALES_PREVIEW ? (showAllSales ? t.seeLess : t.seeAll) : `${recentSales.length} ${lang === 'th' ? 'บิล' : 'orders'}`}
                  onRightPress={recentSales.length > SALES_PREVIEW ? () => setShowAllSales(v => !v) : undefined}>
                  <TableHead cols={SALE_COLS} />
                  {!loading && visibleSales.length === 0 && <Empty text={t.noSales} />}
                  {visibleSales.map((sale, i) => (
                    <TableRow key={sale.id} cols={SALE_COLS} last={i === visibleSales.length - 1}
                      onPress={() => openSale(sale)}
                      cells={[
                        <TdNo text={sale.sale_no} />,
                        new Date(sale.sold_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                        <TdMain text={sale.customer_name || 'ไม่ระบุ'} />,
                        <TdMain text={payLabel(sale.payment_methods)} />,
                        <TdAmt text={`฿${fmt(sale.total)}`} />,
                      ]} />
                  ))}
                </Panel>
              </View>

              <View style={styles.colSide}>
                <Panel title={t.pendingLabel}
                  right={`${pendingPOs.length + pendingSrvs.length} ${lang === 'th' ? 'รายการ' : 'items'}`}>
                  {!loading && pendingPOs.length === 0 && pendingSrvs.length === 0 && <Empty text={t.noPending} />}
                  {pendingPOs.map(po => (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} key={po.id}
                      onPress={() => navigation.navigate('PurchaseOrder')} style={styles.task}>
                      <View style={[styles.taskStripe, { backgroundColor: '#550a19' }]} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{po.po_no} · {po.supplier_name || 'ไม่ระบุ'}</Text>
                        <Text style={styles.taskSub} numberOfLines={1}>
                          {POSTATUS_LABEL[po.status] || po.status} · ฿{fmt(po.total)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {pendingSrvs.map(sv => (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} key={sv.id}
                      onPress={() => navigation.navigate('ServiceOrder')} style={styles.task}>
                      <View style={[styles.taskStripe, { backgroundColor: '#c98a97' }]} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{sv.service_no} · {sv.product_name || '—'}</Text>
                        <Text style={styles.taskSub} numberOfLines={1}>
                          {SRVSTATUS_LABEL[sv.status] || sv.status} · {sv.customer_name || 'ไม่ระบุ'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Panel>

                <Panel title={t.lowStockTitle}
                  right={`${lowStock.length} ${lang === 'th' ? 'รายการ' : 'items'}`}>
                  {!loading && lowStock.length === 0 && <Empty text={t.noLowStock} />}
                  {lowStock.map(pr => (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} key={pr.id}
                      onPress={() => navigation.navigate('Inventory')} style={styles.task}>
                      <View style={[styles.taskStripe, { backgroundColor: Number(pr.stock_qty) <= 1 ? '#550a19' : '#e8c7cf' }]} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{pr.name || pr.sku}</Text>
                        <Text style={styles.taskSub} numberOfLines={1}>{t.lowStockSub(pr.stock_qty)} · {pr.sku}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Panel>
              </View>
            </View>
          </>
        ) : (
          <>
        {/* KPI */}
        <View dataSet={{ hov: 'dark' }} style={styles.kpiMain}>
          <Text style={styles.kpiMainLabel}>{t.todayLabel}</Text>
          <Text style={styles.kpiMainValue}>{loading ? '—' : `฿${fmt(summary?.total_sales || 0)}`}</Text>
          <Text style={styles.kpiMainSub}>{loading ? '' : `${summary?.order_count || 0} รายการ`}</Text>
        </View>
        <View style={styles.kpiWrap}>
        <View style={[styles.kpiRow, styles.kpiFlexItem]}>
          {[
            [t.stockLabel, loading ? '—' : String(summary?.stock_count || 0), t.stockSub, '#550a19', '#fdf0f2', 'diamond-outline'],
            [t.allLabel,   loading ? '—' : fmt(summary?.total_pieces || 0),   t.allSub,   '#550a19', '#fdf0f2', 'package-variant-closed'],
          ].map(([label, val, sub, col, bg, icon]) => (
            <View key={label} dataSet={{ hov: 'card' }} style={styles.kpiCard}>
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
        <View dataSet={{ hov: 'card' }} style={[styles.profitCard, styles.profitFlexItem]}>
          <View style={styles.kpiCardTop}>
            <Text style={styles.kpiCardLabel}>{t.profitLabel}</Text>
            <View style={[styles.kpiIcon, { backgroundColor: '#fdf0f2' }]}>
              <MaterialCommunityIcons name="trending-up" size={sc(13)} color="#550a19" />
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
              <Text style={[styles.kpiCardValue, { color: '#550a19' }]}>
                {loading ? '—' : `฿${fmt(summary?.profit_incl_vat ?? summary?.estimated_profit ?? 0)}`}
              </Text>
              <Text style={styles.kpiCardSub}>{t.profitSub2}</Text>
            </View>
          </View>
        </View>
        </View>

        {/* ทางลัด — แทนตารางเมนูเดิม เพราะเมนูย้ายไปอยู่แถบซ้าย (จอกว้าง) และลิ้นชัก (จอแคบ) แล้ว */}
        <View style={styles.quickRow}>
          {[
            ['บันทึกขายใหม่',       'plus',            'Sale'],
            ['เพิ่มสินค้าเข้าสต๊อก', 'diamond-outline', 'Stock'],
            ['ปริ้นป้ายสินค้า',     'printer-outline', 'Inventory'],
            ['ออกใบเสร็จ',         'cash-multiple',   'Receipt'],
          ].map(([label, icon, screen], i) => (
            <TouchableOpacity dataSet={{ hov: 'btn' }}
              key={screen}
              onPress={() => navigation.navigate(screen)}
              style={[styles.quickBtn, i === 0 && styles.quickBtnPri]}
            >
              <MaterialCommunityIcons name={icon} size={sc(15)} color={i === 0 ? '#fff5f7' : '#550a19'} />
              <Text style={[styles.quickText, i === 0 && { color: '#fff5f7' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RECENT SALES */}
        <Text style={styles.listTitle}>
          <MaterialCommunityIcons name="cart" size={sc(13)} color="#550a19" /> {t.recentTitle}
        </Text>
        {!loading && recentSales.length === 0 && (
          <Text style={styles.emptyText}>{t.noSales}</Text>
        )}
        {visibleSales.map(s => (
          <TouchableOpacity dataSet={{ hov: 'btn' }} key={s.id} onPress={() => openSale(s)} style={styles.listCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listCardTitle}>{s.sale_no}</Text>
              <Text style={styles.listCardSub}>
                {new Date(s.sold_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} · {s.customer_name || 'ไม่ระบุ'}
              </Text>
            </View>
            <Text style={styles.listCardAmt}>฿{fmt(s.total)}</Text>
          </TouchableOpacity>
        ))}
        {recentSales.length > SALES_PREVIEW && (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowAllSales(v => !v)} style={styles.moreBtn}>
            <Text style={styles.moreText}>{showAllSales ? t.seeLess : t.seeAll}</Text>
          </TouchableOpacity>
        )}

        {/* PENDING COUNTS */}
        <Text style={styles.listTitle}>
          <MaterialCommunityIcons name="clock-outline" size={sc(13)} color="#550a19" /> {t.pendingLabel}
        </Text>
        <View style={styles.pendingRow}>
          {[
            { title: t.poTitle,  count: pendingPOs.length,   icon: 'truck-delivery', col: '#8c1b2f', bg: '#fdf0f2', screen: 'PurchaseOrder' },
            { title: t.srvTitle, count: pendingSrvs.length,  icon: 'tools',          col: '#8c1b2f', bg: '#fdf0f2', screen: 'ServiceOrder'  },
          ].map(p => (
            <TouchableOpacity dataSet={{ hov: 'btn' }} key={p.title} onPress={() => navigation.navigate(p.screen)}
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
            <TouchableOpacity dataSet={{ hov: 'btn' }} key={po.id} onPress={() => navigation.navigate('PurchaseOrder')} style={styles.listCard}>
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
            <TouchableOpacity dataSet={{ hov: 'btn' }} key={s.id} onPress={() => navigation.navigate('ServiceOrder')} style={styles.listCard}>
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
          </>
        )}

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
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setSaleDetail(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={openReceiptForSale} disabled={rcBusy}
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
  header: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ece0e3' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  // โลโก้ร้าน (เวอร์ชันสีครีม) — สัดส่วนต้นฉบับ 413 × 300
  logoutBtn: {
    borderWidth: 1, borderColor: '#ece0e3', backgroundColor: '#fff',
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5,
  },
  logoutText: { fontSize: 11.5, fontWeight: '600', color: '#550a19' },
  moreBtn: {
    alignSelf: 'center', marginTop: 4, marginBottom: 4,
    borderWidth: 1, borderColor: '#ece0e3', backgroundColor: '#fff',
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
  },
  moreText: { fontSize: 12, fontWeight: '600', color: '#550a19' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  tile: {
    flex: 1, minWidth: 180,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 14, gap: 2,
  },
  tileLead: { flexGrow: 1.5, backgroundColor: '#550a19', borderColor: '#550a19' },
  tileLeadLabel: { fontSize: 11, color: '#e0b3bf' },
  tileLeadValue: { fontSize: 25, fontWeight: '600', color: '#fff5f7', lineHeight: 32 },
  tileLeadSub:   { fontSize: 11, color: '#f0c8d1' },
  tileLabel: { fontSize: 11, color: '#9b7d86' },
  tileValue: { fontSize: 23, fontWeight: '600', color: '#2c1015', lineHeight: 30 },
  tileSub:   { fontSize: 11, color: '#9b7d86' },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start', marginTop: 14 },
  colMain: { flexGrow: 1.6, flexShrink: 1, flexBasis: 420, minWidth: 0 },
  colSide: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, gap: 14 },
  task: {
    flexDirection: 'row', alignItems: 'stretch', gap: 11,
    paddingHorizontal: 15, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#f5edef',
  },
  taskStripe: { width: 3, borderRadius: 3 },
  taskTitle: { fontSize: 12, color: '#2c1015', fontWeight: '500' },
  taskSub:   { fontSize: 10.5, color: '#9b7d86', marginTop: 1 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ece0e3', borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 10,
  },
  quickBtnPri: { backgroundColor: '#550a19', borderColor: '#550a19' },
  quickText: { fontSize: 12.5, fontWeight: '500', color: '#2c1015' },
  burgerBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#ece0e3',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 4,
  },
  logoImg: { width: 55, height: 40 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#ece0e3',
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5,
  },
  headerBtnText: { fontSize: 11.5, fontWeight: '600', color: '#550a19' },
  dateStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f5edef',
    paddingHorizontal: 16, paddingVertical: 7,
  },
  dateText: { fontSize: 12, color: '#9b7d86' },
  dateBold: { fontWeight: '600', color: '#2c1015' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 30 },
  kpiMain: {
    backgroundColor: '#550a19', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  kpiMainLabel: { fontSize: 11, color: '#d4a0ac', marginBottom: 3 },   // ชุดเดียวกับ kpiCardLabel / sectionTitle
  kpiMainValue: { fontSize: 26, fontWeight: '500', color: '#fff5f7' },
  kpiMainSub:   { fontSize: 10, color: '#c090a0', marginTop: 3 },      // ชุดเดียวกับ kpiCardSub
  // กล่องครอบ KPI + กำไร — จอกว้างเรียงแถวเดียว จอแคบตัดบรรทัดเองอัตโนมัติ
  // ควบคุมจุดตัดด้วย minWidth ของลูก ไม่ต้องผูก breakpoint ตายตัว
  kpiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  // flexBasis (ไม่ใช่ minWidth) — จอเล็กกว่านี้จะหดลงมาพอดีจอแทนที่จะล้นออกนอกขอบ
  kpiFlexItem:    { flexGrow: 1, flexShrink: 1, flexBasis: 340, minWidth: 0, marginBottom: 0 },
  profitFlexItem: { flexGrow: 1, flexShrink: 1, flexBasis: 380, minWidth: 0, marginBottom: 0 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13 },
  // การ์ดเดี่ยวเต็มความกว้าง — ห้ามใช้ flex:1 ของ kpiCard ไม่งั้นความสูงยุบเป็น 0
  profitCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13, marginBottom: 10 },
  profitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 2 },
  profitDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#ece0e3' },
  kpiCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  kpiCardLabel: { fontSize: 11, color: '#a07080', flex: 1 },
  kpiIcon: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  kpiCardValue: { fontSize: 17, fontWeight: '500', color: '#2c1015' },
  kpiCardSub:   { fontSize: 10, color: '#b09090', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13, marginBottom: 10 },
  // ไม่ใส่ letterSpacing — ภาษาไทยใส่แล้วสระ/วรรณยุกต์ลอยห่างจากพยัญชนะ ดูไม่เข้าชุดกับ label อื่น
  sectionTitle: { fontSize: 11, fontWeight: '500', color: '#a07080', marginBottom: 10 },
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
