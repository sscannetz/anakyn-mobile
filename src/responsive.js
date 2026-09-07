// ══════════════════════════════════════════════════════════════
// responsive.js — ปรับขนาด UI ตามความกว้างหน้าจอ
//
// แนวคิด: "หน้าตาเหมือนเดิมเป๊ะ แค่ใหญ่ขึ้นตามจอ"
//   มือถือ (< 768)  → scale 1.00  = เท่าเดิมทุกอย่าง ไม่มีอะไรเปลี่ยน
//   แท็บเล็ต (768+) → scale 1.22
//   คอม (1180+)     → scale 1.45  ปุ่ม/ตัวหนังสือใหญ่ขึ้น อ่านสบายขึ้น
//
// ไม่ได้ออกแบบใหม่ ไม่เปลี่ยนสี ไม่เปลี่ยนเลย์เอาต์ — คูณตัวเลขขึ้นอย่างเดียว
// ══════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

export const BP = { tablet: 768, desktop: 1180 };

// property ที่ "คูณได้" — ไวต์ลิสต์ไว้ ปลอดภัยกว่าแบล็กลิสต์
// (flex, opacity, zIndex, aspectRatio ฯลฯ ไม่อยู่ในนี้ → ไม่ถูกแตะ)
const SCALABLE = new Set([
  'fontSize', 'lineHeight', 'letterSpacing',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'paddingHorizontal', 'paddingVertical',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
  'gap', 'rowGap', 'columnGap',
  'top', 'bottom', 'left', 'right',
]);

// เส้นขอบบางมาก (0.5) ถ้าคูณขึ้นจะดูหนาเทอะทะ — ตรึงเพดานไว้
const BORDER_KEYS = new Set(['borderWidth', 'borderTopWidth', 'borderBottomWidth',
  'borderLeftWidth', 'borderRightWidth']);

function scaleValue(key, value, scale) {
  if (typeof value !== 'number') return value;          // '24%' / 'auto' ปล่อยผ่าน
  if (BORDER_KEYS.has(key)) return Math.min(value * scale, 1.2);
  if (!SCALABLE.has(key)) return value;
  return Math.round(value * scale * 100) / 100;
}

function scaleRule(rule, scale) {
  const out = {};
  for (const key of Object.keys(rule)) {
    const v = rule[key];
    // รองรับ object ซ้อน เช่น shadowOffset / transform
    if (v && typeof v === 'object' && !Array.isArray(v)) out[key] = scaleRule(v, scale);
    else out[key] = scaleValue(key, v, scale);
  }
  return out;
}

export function scaleStyles(base, scale) {
  if (scale === 1) return StyleSheet.create(base);
  const out = {};
  for (const name of Object.keys(base)) out[name] = scaleRule(base[name], scale);
  return StyleSheet.create(out);
}

/**
 * useResponsive — ข้อมูลขนาดจอ + ตัวช่วยคูณ
 *   scale     ตัวคูณปัจจุบัน
 *   sc(n)     คูณเลขเดี่ยว ๆ (ใช้กับ prop ที่อยู่ใน JSX เช่น size ของไอคอน)
 *   maxWidth  ความกว้างสูงสุดของเนื้อหาบนจอกว้าง (กันยืดเต็มจอ 27 นิ้วแล้วอ่านยาก)
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= BP.desktop;
  const isTablet = width >= BP.tablet;
  const scale = isDesktop ? 1.45 : isTablet ? 1.22 : 1;
  const maxWidth = isDesktop ? 1180 : isTablet ? 900 : null;

  return useMemo(() => ({
    width, height, isTablet, isDesktop, scale, maxWidth,
    sc: (n) => Math.round(n * scale),
    // ใส่ใน contentContainerStyle ของ ScrollView → เนื้อหาอยู่กลางจอ ไม่ยืดสุดขอบ
    center: maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null,
  }), [width, height, isTablet, isDesktop, scale, maxWidth]);
}

/**
 * useScaledStyles — แปลง style object ธรรมดาเป็น StyleSheet ที่คูณตามจอแล้ว
 *
 *   const baseStyles = { card: { padding: 10, fontSize: 12 } };   // ← ไม่ต้อง StyleSheet.create
 *   const { styles, sc, center } = useScaledStyles(baseStyles);
 */
export function useScaledStyles(base) {
  const r = useResponsive();
  const styles = useMemo(() => scaleStyles(base, r.scale), [base, r.scale]);
  return { ...r, styles };
}
