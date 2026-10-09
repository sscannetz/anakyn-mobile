// ══════════════════════════════════════════════════════════════
// theme.js — สีกลางของทั้งแอป (โหมดปกติ / โหมดไว้อาลัย)
//
// ★ กฎเหล็ก 3 ข้อ
//   1. ค่าในโหมดสว่าง = สีเดิมที่เคยเขียนไว้ในแต่ละหน้า "เป๊ะทุกตัว"
//      เปลี่ยนมาใช้ token แล้วหน้าตาโหมดสว่างต้องไม่ขยับเลย
//   2. สีแบรนด์แยกเป็น 2 token เพราะบทบาทต่างกัน
//      brand   = ใช้เป็นตัวหนังสือ/ไอคอน → โหมดมืดต้อง "สว่าง" ไม่งั้นจมพื้น
//      brandBg = ใช้เป็นพื้นปุ่ม        → โหมดมืดต้อง "เข้ม" ไม่งั้นแสบตา
//      (#550a19 เดิมใช้ปนกันทั้ง 2 บทบาท 292 จุด ถ้าไม่แยกจะพังครึ่งหนึ่ง)
//   3. เอกสารที่พิมพ์ลงกระดาษ (print.js / DocLayout / TagPreview) ไม่แตะ
//      ใบเสร็จ ใบกำกับ ป้าย tag ต้องขาวเสมอ ไม่งั้นพิมพ์ออกมาดำทั้งแผ่น
// ══════════════════════════════════════════════════════════════
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemePref, saveThemePref } from './storage';

export const LIGHT = {
  mode: 'light',
  // ── พื้นผิว ──
  bg:        '#fdfbfb',   // พื้นหน้าจอ
  card:      '#ffffff',   // การ์ด/แผง
  card2:     '#f9f4f5',   // พื้นรองอ่อน (แถวสลับ หัวตาราง)
  soft:      '#fdf0f2',   // แผงชมพูอ่อน (chip, แถบเน้น)
  softer:    '#f5edef',   // อ่อนกว่า soft
  headBg:    '#fdfafb',   // หัวตาราง
  overlay:   'rgba(44,16,21,0.42)',
  // ── ตัวหนังสือ ──
  ink:       '#2c1015',   // ตัวหนังสือหลัก
  muted:     '#9b7d86',   // รอง
  muted2:    '#a07080',   // รอง (โทนชมพู)
  dim:       '#b08090',   // จางลงอีก
  faint:     '#c0a0a8',   // placeholder
  // ── แบรนด์ ──
  brand:     '#550a19',   // ตัวหนังสือ/ไอคอนสีแบรนด์
  brandBg:   '#550a19',   // พื้นปุ่มสีแบรนด์
  brandOn:   '#fff5f7',   // ตัวหนังสือบนพื้นแบรนด์
  brand2:    '#8c1b2f',   // แบรนด์โทนอ่อนลง
  brandSoft: '#fdf0f2',   // พื้นอ่อนโทนแบรนด์
  // ── เส้น ──
  line:      '#ece0e3',
  line2:     '#e8d5d9',
  line3:     '#e8c0c8',
  hair:      '#f0e4e8',   // เส้นบางมาก (แบ่งแถว)
  // ── สถานะ ──
  ok:        '#2e7d32',  okBg:     '#e8f5e9',
  danger:    '#a32d2d',  dangerBg: '#fdf0f2',
  warn:      '#854f0b',  warnBg:   '#fff8e1',
  info:      '#1a3a60',  infoBg:   '#e0f0ff',
  shadow:    '#2c1015',
};

export const MOURN = {
  mode: 'mourn',
  // ── โหมดไว้อาลัย ── ถอดสีออกให้หมด เหลือเทาล้วน
  // ความ "สว่าง" ของแต่ละ token เท่าเดิมกับโหมดปกติ เลย์เอาต์เลยอ่านง่ายเหมือนเดิม
  // เปลี่ยนแค่ "ความอิ่มสี" ให้เป็นศูนย์ ตามธรรมเนียมเว็บไทยช่วงไว้อาลัย
  bg:        '#fafafa',
  card:      '#ffffff',
  card2:     '#f4f4f4',
  soft:      '#f0f0f0',
  softer:    '#f2f2f2',
  headBg:    '#fafafa',
  overlay:   'rgba(0,0,0,0.45)',
  ink:       '#1f1f1f',
  muted:     '#6e6e6e',
  muted2:    '#5f5f5f',
  dim:       '#8a8a8a',
  faint:     '#a6a6a6',
  // สีแบรนด์กลายเป็นเทาเข้ม — ยังแยก "ตัวหนังสือ" กับ "พื้นปุ่ม" เหมือนเดิม
  brand:     '#2e2e2e',
  brandBg:   '#3a3a3a',
  brandOn:   '#ffffff',
  brand2:    '#4a4a4a',
  brandSoft: '#efefef',
  line:      '#e2e2e2',
  line2:     '#dadada',
  line3:     '#c9c9c9',
  hair:      '#ebebeb',
  // ★ สถานะยังต้องแยกออกจากกันให้ได้ ไม่งั้นกดขายผิดแล้วไม่รู้ตัว
  //   เลยไม่ใช้เทาเดียวกันหมด แต่ไล่ "ความเข้ม" ให้ต่างกันชัด ๆ แทนการใช้สี
  ok:        '#4f4f4f',  okBg:     '#eeeeee',
  danger:    '#1a1a1a',  dangerBg: '#e4e4e4',
  warn:      '#5f5f5f',  warnBg:   '#ededed',
  info:      '#555555',  infoBg:   '#efefef',
  shadow:    '#000000',
};


// 'system' = ตามเครื่อง · 'light' = ปกติ · 'mourn' = ไว้อาลัย (เทาล้วน)
const ThemeCtx = createContext({ t: LIGHT, pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }) {
  const system = useColorScheme();            // 'light' | 'dark' | null
  const [pref, setPrefState] = useState('system');

  // อ่านค่าที่เคยเลือกไว้ — ยังไม่เคยเลือกก็ปล่อยเป็น system
  useEffect(() => {
    let alive = true;
    getThemePref().then(v => { if (alive && (v === 'light' || v === 'mourn')) setPrefState(v); });
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => {
    // 'system' = ตามเครื่อง (เครื่องตั้งมืด → เข้าโหมดไว้อาลัย)
    const mourn = pref === 'system' ? system === 'dark' : pref === 'mourn';
    return {
      t: mourn ? MOURN : LIGHT,
      mourn,
      pref,
      setPref: (p) => { setPrefState(p); saveThemePref(p); },
      toggle: () => {
        const next = !(pref === 'system' ? system === 'dark' : pref === 'mourn');
        const p = next ? 'mourn' : 'light';
        setPrefState(p); saveThemePref(p);
      },
    };
  }, [pref, system]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() { return useContext(ThemeCtx); }
