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
  // ★ ตัวคูณขนาดโดยรวม — คุมตัวหนังสือ ระยะขอบ ความสูงการ์ด ฯลฯ
  //   ไม่มีผลกับไอคอนเมนู เพราะไอคอนตั้งเป็นค่าคงที่ (menuIconSize) แยกต่างหาก
  //   ใหญ่ไป → ลดลงทีละ 0.05 · เล็กไป → เพิ่มทีละ 0.05
  const scale = isDesktop ? 1.18 : isTablet ? 1.08 : 1;

  // ── กริดเมนู ──
  // มือถือ: แบ่ง 4 คอลัมน์เท่า ๆ กัน (เหมือนเดิมทุกประการ)
  // จอใหญ่: ใช้ "ความกว้างคงที่" แทน % ไม่งั้นช่องจะกว้างมากจนไอคอนลอยอยู่กลางที่ว่าง
  //         แล้วปล่อยให้ขึ้นบรรทัดใหม่เองตามจำนวนที่ใส่ได้
  // ── กริดเมนู ──
  // จอใหญ่ (768+) : ช่องขนาดคงที่ ไอคอนใหญ่ ช่องไฟแคบ
  // จอเล็ก (<768) : คำนวณจำนวนคอลัมน์จากความกว้างจริง แล้วขยายไอคอนตามขนาดช่อง
  //                 → สัดส่วน "ไอคอนต่อช่อง" คงที่ ไม่ว่าจอกว้างเท่าไหร่ ช่องไฟเลยไม่บาน
  //                 มือถือจริง (~390px) ยังได้ 4 คอลัมน์ ไอคอน 44px เท่าเดิมทุกอย่าง
  const contentPad = 14 * scale;
  const avail = Math.max(280, width - contentPad * 2);

  let menuItemWidth, menuIconSize, menuGap, menuPadX;
  if (isTablet) {
    menuItemWidth = isDesktop ? 130 : 110;
    menuIconSize  = isDesktop ? 104 : 76;
    menuGap = 4;
    menuPadX = 2;
  } else {
    // เล็งให้ช่องกว้างราว 88-105px — ยิ่งช่องแคบ ไอคอนยิ่งชิดกัน
    const cols = Math.max(4, Math.min(8, Math.floor(avail / 88)));

    // ⚠ ห้ามใช้ 100/cols เป๊ะ ๆ — รวมกันได้ 100% พอดี พอบวก gap เข้าไปจะเกิน
    //   แล้วช่องสุดท้ายตกบรรทัด (4 คอลัมน์กลายเป็น 3) จึงหักทิ้ง 0.3% กันพลาด
    menuItemWidth = `${(100 / cols - 0.3).toFixed(4)}%`;

    // ไอคอนโตตามขนาดช่อง → สัดส่วนไอคอนต่อช่องคงที่ ช่องไฟไม่บานไม่ว่าจอกว้างเท่าไหร่
    const cellW = avail / cols;
    menuIconSize = Math.min(96, Math.max(40, Math.round(cellW * 0.64)));
    menuGap = 0;
    menuPadX = 1;
  }

  return useMemo(() => ({
    width, height, isTablet, isDesktop, scale,
    sc: (n) => Math.round(n * scale),
    menuItemStyle: menuPadX != null
      ? { width: menuItemWidth, paddingHorizontal: menuPadX }
      : { width: menuItemWidth },
    menuGridStyle: menuGap != null ? { gap: menuGap } : null,
    menuIconStyle: menuIconSize
      ? { width: menuIconSize, height: menuIconSize, borderRadius: Math.round(menuIconSize * 0.28) }
      : null,
    menuEmojiSize: menuIconSize ? Math.round(menuIconSize * 0.5) : 22,
    // เต็มความกว้างจอ — ไม่บีบเป็นคอลัมน์กลางแล้ว
    center: null,
  }), [width, height, isTablet, isDesktop, scale, menuItemWidth, menuIconSize, menuGap, menuPadX]);
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
