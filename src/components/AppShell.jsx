// ══════════════════════════════════════════════════════════════
// AppShell.jsx — โครงหน้าจอที่ครอบทุกหน้า
//
//   จอกว้าง (>= 1024)  → แถบเมนูสีแดงค้างอยู่ซ้ายมือตลอด
//   จอแคบ / มือถือ     → ลิ้นชักเมนู ปัดจากขอบซ้ายเข้ามา หรือกดปุ่มขีดสามขีด
//
// วางไว้ครอบ Navigator ใน App.js จึงไม่ต้องแก้หน้าจอทั้ง 11 หน้า
// หน้า Login ไม่แสดงโครงนี้
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, Animated,
  Platform, useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { navRef, goTo, onDrawer, setDrawer, isDrawerOpen } from '../navRef';
import { clearSession, getRole } from '../storage';
import { LOGO_LIGHT_URI } from '../logoBase64';

export const SHELL_BP = 1024;      // ต่ำกว่านี้ใช้ลิ้นชักแทนแถบซ้าย
const SIDE_W   = 242;
const DRAWER_W = 278;
const EDGE     = 26;               // ระยะจากขอบซ้ายที่เริ่มปัดได้
// เว็บต้องใช้ JS driver — ระหว่างลากนิ้วเราสั่ง setValue() เองตลอด
// ถ้าใช้ native driver จะชนกันแล้วโยน error
const NATIVE_DRIVER = Platform.OS !== 'web';

const MENUS = [
  { grp: 'ภาพรวม' },
  { key: 'Home',          icon: 'view-dashboard-outline', label: 'หน้าหลัก' },
  { key: 'Sale',          icon: 'shopping-outline',       label: 'บันทึกขาย' },
  { key: 'Inventory',     icon: 'tag-outline',            label: 'สต๊อกสินค้า' },
  { key: 'Stock',         icon: 'diamond-outline',        label: 'เพิ่มสต๊อกสินค้า' },
  { grp: 'เอกสาร' },
  { key: 'Invoice',       icon: 'receipt',                label: 'Invoice' },
  { key: 'Quotation',     icon: 'file-document-outline',  label: 'ใบเสนอราคา' },
  { key: 'PurchaseOrder', icon: 'truck-outline',          label: 'ใบสั่งซื้อ' },
  { key: 'ServiceOrder',  icon: 'wrench-outline',         label: 'ใบสั่งซ่อม' },
  { key: 'Receipt',       icon: 'cash-multiple',          label: 'ใบเสร็จรับเงิน' },
  { grp: 'อื่น ๆ' },
  { key: 'Summary',       icon: 'chart-box-outline',      label: 'สรุปรายงาน' },
  { key: 'AddUser',       icon: 'account-cog-outline',    label: 'จัดการผู้ใช้', adminOnly: true },
];

function NavList({ active, role, onPick, onLogout }) {
  const items = MENUS.filter(m => !m.adminOnly || role === 'admin');
  return (
    <>
      <View style={S.sideTop}>
        <Image source={{ uri: LOGO_LIGHT_URI }} style={S.logo} resizeMode="contain" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={S.navList} showsVerticalScrollIndicator={false}>
        {items.map((m, i) => {
          if (m.grp) return <Text key={'g' + i} style={S.grp}>{m.grp}</Text>;
          const on = active === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              dataSet={{ hov: 'nav', on: on ? '1' : '0' }}
              onPress={() => onPick(m.key)}
              style={[S.navItem, on && S.navItemOn]}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name={m.icon} size={17} color={on ? '#550a19' : '#e8c7cf'} />
              <Text style={[S.navText, on && S.navTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={S.sideFoot}>
        <View style={S.av}><Text style={S.avText}>{role === 'admin' ? 'A' : 'S'}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={S.whoName} numberOfLines={1}>
            {role === 'admin' ? 'แอดมิน' : 'พนักงาน'}
          </Text>
          <Text style={S.whoSub} numberOfLines={1}>Anakyn Gems</Text>
        </View>
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onLogout} style={S.outBtn}>
          <MaterialCommunityIcons name="logout" size={14} color="#f5e0e5" />
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function AppShell({ routeName, children }) {
  const { width } = useWindowDimensions();
  const hasSide = Platform.OS === 'web' && width >= SHELL_BP;
  const show    = !!routeName && routeName !== 'Login';

  const [role, setRole] = useState('staff');
  const [open, setOpen] = useState(false);
  const pos = useRef(new Animated.Value(0)).current;   // 0 = ปิด, 1 = เปิด

  useEffect(() => {
    getRole().then(r => setRole(r || 'staff')).catch(() => {});
  }, [routeName]);

  // ── ผูกกับร้านเก็บสถานะ (ปุ่มขีดสามขีดใน Header เรียกมาทางนี้) ──
  useEffect(() => onDrawer(v => {
    setOpen(v);
    Animated.timing(pos, { toValue: v ? 1 : 0, duration: 190, useNativeDriver: NATIVE_DRIVER }).start();
  }), []);

  // จอกว้างแล้วไม่ต้องมีลิ้นชักค้างไว้
  useEffect(() => { if (hasSide && isDrawerOpen()) setDrawer(false); }, [hasSide]);

  // ล็อกไม่ให้หน้าข้างหลังเลื่อนตอนลิ้นชักเปิด (เว็บ)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── ปัดนิ้ว / ลากเมาส์จากขอบซ้าย (เว็บเท่านั้น) ──
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (hasSide || !show) return;

    let drag = null;
    const clamp = v => Math.max(0, Math.min(1, v));

    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const opened = isDrawerOpen();
      if (!opened && e.clientX > EDGE) return;
      drag = { x0: e.clientX, base: opened ? 1 : 0, moved: false };
    };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (Math.abs(dx) > 4) drag.moved = true;
      if (!drag.moved) return;
      pos.setValue(clamp(drag.base + dx / DRAWER_W));
      if (e.cancelable) e.preventDefault();
    };
    const up = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      const v  = clamp(drag.base + dx / DRAWER_W);
      const wasMoved = drag.moved;
      drag = null;
      if (!wasMoved) return;
      setDrawer(v > 0.4);
      Animated.timing(pos, { toValue: v > 0.4 ? 1 : 0, duration: 150, useNativeDriver: NATIVE_DRIVER }).start();
    };

    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointercancel', up, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    };
  }, [hasSide, show]);

  const logout = async () => {
    setDrawer(false);
    try { await clearSession(); } catch (_) {}
    if (navRef.isReady()) navRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (!show) return <View style={{ flex: 1 }}>{children}</View>;

  // ── จอกว้าง: แถบซ้ายค้างไว้ ──
  if (hasSide) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[S.side, S.sideFixed]}>
          <NavList active={routeName} role={role} onPick={goTo} onLogout={logout} />
        </View>
        <View style={{ flex: 1, paddingLeft: SIDE_W }}>{children}</View>
      </View>
    );
  }

  // ── จอแคบ: ลิ้นชัก ──
  const tx = pos.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_W, 0] });
  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[S.scrim, { opacity: pos }]}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDrawer(false)} />
      </Animated.View>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[S.side, S.drawer, { transform: [{ translateX: tx }] }]}
      >
        <NavList active={routeName} role={role} onPick={goTo} onLogout={logout} />
      </Animated.View>
    </View>
  );
}

const S = {
  side: {
    width: SIDE_W,
    backgroundColor: '#550a19',
    paddingTop: 16,
    paddingBottom: 12,
  },
  sideFixed: {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    zIndex: 40,
  },
  drawer: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0, left: 0, bottom: 0,
    width: DRAWER_W,
    zIndex: 60,
    paddingTop: 24,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 6, height: 0 },
    elevation: 16,
  },
  scrim: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(26,6,11,0.5)',
    zIndex: 50,
  },
  sideTop: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  logo: { height: 26, width: 118 },
  navList: { paddingHorizontal: 10, paddingVertical: 8, gap: 1 },
  grp: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#c79eab',
    paddingHorizontal: 10,
    paddingTop: 13,
    paddingBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
  },
  navItemOn: { backgroundColor: '#fff5f7' },
  navText: { fontSize: 12.5, color: '#fff5f7' },
  navTextOn: { color: '#550a19', fontWeight: '600' },
  sideFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  av: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff5f7',
    justifyContent: 'center', alignItems: 'center',
  },
  avText: { fontSize: 12, fontWeight: '600', color: '#550a19' },
  whoName: { fontSize: 11.5, color: '#fff5f7', fontWeight: '600' },
  whoSub:  { fontSize: 10, color: '#d9aebb' },
  outBtn: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
};
