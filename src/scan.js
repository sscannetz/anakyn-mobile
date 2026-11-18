// ═══════════════════════════════════════════════════════════════
// scan.js — ลิงก์จาก QR บนป้ายสินค้า
//   สแกน QR → เปิดเว็บที่  <WEB_URL>/?s=0143
//   → แอปอ่านรหัส แล้วพาไปหน้า "บันทึกการขาย" พร้อมใส่สินค้าชิ้นนั้นในตะกร้าให้เลย
//   (พนักงานกรอกเองแค่ ชื่อลูกค้า + ช่องทางชำระเงิน)
//
//   ทำไม URL ต้องสั้น: ป้ายกว้างแค่ 25 มม. QR พิมพ์ได้ ~11 มม.
//   URL ยิ่งยาว QR ยิ่งมีโมดูลเยอะ → แต่ละโมดูลเล็กลงจนสแกนไม่ติด
//   ตัด "ANAKYN#" ออก ทำให้ QR เหลือ 29×29 (โมดูล ~0.36 มม.) แทน 33×33 (~0.28 มม.)
// ═══════════════════════════════════════════════════════════════
import { Platform } from 'react-native';

// โดเมนที่ QR บนป้ายจะชี้ไป — ถ้าย้ายโดเมนต้องแก้ตรงนี้แล้วพิมพ์ป้ายใหม่
export const WEB_URL = 'https://anakyngems.vercel.app';

// คำนำหน้า SKU ตามวัสดุโลหะ → ตัวย่อที่ใช้ใน QR (ให้ QR เล็กพอสแกนติดบนป้าย)
//   ทอง/อื่นๆ ANAKYN#0143 → "0143" · เงิน SVAKYN#0001 → "S0001" · แพลตตินัม PLAKYN#0001 → "P0001"
export const SKU_PREFIXES = { ANAKYN: '', SVAKYN: 'S', PLAKYN: 'P' };
export function skuPrefixForMetal(metal) {
  const m = String(metal || '').toLowerCase();
  if (m === 'silver') return 'SVAKYN';
  if (m === 'platinum') return 'PLAKYN';
  return 'ANAKYN';
}

// รหัสเต็ม → รูปย่อ (ถ้าไม่ขึ้นต้นด้วยคำนำหน้าที่รู้จัก จะคืนค่าเดิม)
export function shortSku(sku) {
  const s = String(sku || '').trim();
  const up = s.toUpperCase();
  for (const [prefix, short] of Object.entries(SKU_PREFIXES)) {
    if (up.startsWith(prefix + '#')) return short + s.slice(prefix.length + 1);
  }
  return s;
}

// ทำให้เทียบ SKU ได้ไม่ว่าจะเป็นรูปเต็มหรือรูปย่อ / พิมพ์เล็กใหญ่
export const normSku = (sku) => shortSku(sku).toLowerCase();

// แยก SKU เป็น 2 บรรทัดสำหรับป้ายสินค้า
//   "ANAKYN#0207" → { brand: 'ANAKYN', code: '#0207' }  (SVAKYN / PLAKYN ก็เหมือนกัน)
//   รูปแบบอื่น    → { brand: '',       code: <SKU เดิม> }
export function splitSku(sku) {
  const s = String(sku || '').trim();
  const prefix = Object.keys(SKU_PREFIXES).find(p => s.toUpperCase().startsWith(p + '#'));
  if (!prefix) return { brand: '', code: s };
  return { brand: prefix, code: '#' + s.slice(prefix.length + 1) };
}

// URL ที่ฝังลง QR ของสินค้า 1 ชิ้น
export const tagSaleUrl = (sku) => `${WEB_URL}/?s=${encodeURIComponent(shortSku(sku))}`;

// แปลงสิ่งที่สแกนได้ให้เป็น "รหัสสินค้า"
//   รับได้ทั้ง URL จากป้าย (https://.../?s=0143) และรหัสดิบ (ANAKYN#0143 / 0143)
export function parseScanned(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      return (u.searchParams.get('s') || u.searchParams.get('sku') || '').trim();
    } catch (_) {
      const m = s.match(/[?&]s(?:ku)?=([^&#]+)/i);
      return m ? decodeURIComponent(m[1]) : '';
    }
  }
  return s;
}

// ── อ่านรหัสสินค้าจาก URL ครั้งเดียวตอนเปิดแอป (เว็บเท่านั้น) ──
let pendingSku = null;
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
  try {
    const q = new URLSearchParams(window.location.search);
    const sku = q.get('s') || q.get('sku');   // รองรับ ?sku= ของป้ายรุ่นเก่าด้วย
    if (sku) {
      pendingSku = sku;
      // ล้าง query ออกจาก address bar กันกด refresh แล้วเด้งเพิ่มสินค้าซ้ำ
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  } catch (_) { /* URL แปลก ๆ — ข้ามไป */ }
}

export const getPendingSku   = () => pendingSku;
export const clearPendingSku = () => { pendingSku = null; };
