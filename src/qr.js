// ═══════════════════════════════════════════════════════════════
// qr.js — ตัวสร้าง QR Code (byte mode, EC level M, version 1–10)
//   • ไม่พึ่ง library ภายนอก / ไม่ต้องต่อเน็ต
//   • คืนค่าเป็น SVG string → ฝังลง HTML ของเอกสารได้เลย
//     (ต้องสร้างตอน build HTML เพราะ expo-print ไม่รัน <script> ในเอกสาร)
// ═══════════════════════════════════════════════════════════════

// ── ตารางมาตรฐาน ISO/IEC 18004 (เฉพาะ EC level M, version 1–10) ──
const TOTAL_CW   = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346]; // codeword รวม
const EC_PER_BLK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];        // EC codeword ต่อ block
const NUM_BLK    = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];                  // จำนวน block
const ALIGN = [
  [], [6, 18], [6, 22], [6, 26], [6, 30],
  [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

// ── Galois Field GF(256) (primitive 0x11D) ──
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// generator polynomial ดีกรี deg (index 0 = สัมประสิทธิ์ดีกรีสูงสุด = 1 เสมอ)
function rsGenerator(deg) {
  let g = [1];
  for (let i = 0; i < deg; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gmul(g[j], EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsRemainder(data, deg) {
  const gen = rsGenerator(deg);
  const res = new Array(deg).fill(0);
  for (const b of data) {
    const factor = b ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < deg; i++) res[i] ^= gmul(gen[i + 1], factor);
  }
  return res;
}

// ── UTF-8 encode (ไม่พึ่ง TextEncoder เพื่อให้รันได้ทุก runtime) ──
function toUtf8(str) {
  const out = [];
  for (const ch of String(str)) {
    let c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

const getBit = (v, i) => ((v >>> i) & 1) !== 0;

function formatBits(mask) {
  const data = (0 << 3) | mask; // EC level M = 0b00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function versionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}

const MASK_FN = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// ── ค่าปรับ (penalty) เพื่อเลือก mask ที่อ่านง่ายที่สุด ──
const FINDER_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
const FINDER_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];

function penalty(mod, size) {
  let p = 0;

  // กฎ 1 — สีเดียวกันติดกัน 5 ช่องขึ้นไป (แนวนอน + แนวตั้ง)
  for (let i = 0; i < size; i++) {
    for (const horiz of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const cur  = horiz ? mod[i][j]     : mod[j][i];
        const prev = horiz ? mod[i][j - 1] : mod[j - 1][i];
        if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; }
        else run = 1;
      }
    }
  }

  // กฎ 2 — บล็อก 2×2 สีเดียวกัน
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = mod[y][x];
      if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
    }
  }

  // กฎ 3 — ลวดลายคล้าย finder pattern (1:1:3:1:1 + ที่ว่าง 4 ช่อง)
  const matches = (arr, at, pat) => {
    for (let k = 0; k < pat.length; k++) if (arr[at + k] !== !!pat[k]) return false;
    return true;
  };
  for (let i = 0; i < size; i++) {
    const row = mod[i];
    const col = [];
    for (let j = 0; j < size; j++) col.push(mod[j][i]);
    for (const line of [row, col]) {
      for (let j = 0; j + 11 <= size; j++) {
        if (matches(line, j, FINDER_A) || matches(line, j, FINDER_B)) p += 40;
      }
    }
  }

  // กฎ 4 — สัดส่วนสีดำเบี่ยงจาก 50%
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mod[y][x]) dark++;
  const pct = (dark * 100) / (size * size);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return p;
}

/**
 * สร้างเมทริกซ์ QR — คืน { size, mod } โดย mod[y][x] = true คือช่องสีดำ
 * คืน null ถ้าข้อความยาวเกิน version 10 (154 ตัวอักษร ASCII โดยประมาณ)
 */
export function qrMatrix(text) {
  const data = toUtf8(text);

  // 1) เลือก version ที่เล็กที่สุดที่ใส่ข้อมูลได้
  let ver = 0;
  for (let v = 1; v <= 10; v++) {
    const dataCw = TOTAL_CW[v - 1] - EC_PER_BLK[v - 1] * NUM_BLK[v - 1];
    if (4 + (v < 10 ? 8 : 16) + 8 * data.length <= dataCw * 8) { ver = v; break; }
  }
  if (!ver) return null;

  const rawCw   = TOTAL_CW[ver - 1];
  const ecLen   = EC_PER_BLK[ver - 1];
  const numBlk  = NUM_BLK[ver - 1];
  const dataLen = rawCw - ecLen * numBlk;

  // 2) แปลงข้อมูลเป็น bit stream
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(4, 4);                              // mode = byte
  push(data.length, ver < 10 ? 8 : 16);    // ความยาว
  for (const b of data) push(b, 8);
  const capBits = dataLen * 8;
  push(0, Math.min(4, capBits - bits.length));   // terminator
  while (bits.length % 8 !== 0) bits.push(0);    // เติมให้ครบไบต์

  const dataCw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCw.push(b);
  }
  for (let pad = 0xec; dataCw.length < dataLen; pad ^= 0xec ^ 0x11) dataCw.push(pad);

  // 3) แบ่ง block + คำนวณ error correction + สลับเรียง (interleave)
  const shortLen = Math.floor(dataLen / numBlk);
  const numLong  = dataLen % numBlk;
  const blocks = [];
  let off = 0;
  for (let i = 0; i < numBlk; i++) {
    const len = shortLen + (i >= numBlk - numLong ? 1 : 0);
    const d = dataCw.slice(off, off + len);
    off += len;
    blocks.push({ d, e: rsRemainder(d, ecLen) });
  }
  const allCw = [];
  for (let i = 0; i <= shortLen; i++) {
    for (const b of blocks) if (i < b.d.length) allCw.push(b.d[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const b of blocks) allCw.push(b.e[i]);
  }

  // 4) วาดเมทริกซ์
  const size = ver * 4 + 17;
  const mod  = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, v) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    mod[y][x] = v; isFn[y][x] = true;
  };

  // finder + separator
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  }
  // timing pattern
  for (let i = 0; i < size; i++) {
    if (!isFn[i][6]) setFn(6, i, i % 2 === 0);
    if (!isFn[6][i]) setFn(i, 6, i % 2 === 0);
  }
  // alignment pattern
  const pos = ALIGN[ver - 1];
  for (let a = 0; a < pos.length; a++) {
    for (let b = 0; b < pos.length; b++) {
      const skip =
        (a === 0 && b === 0) ||
        (a === 0 && b === pos.length - 1) ||
        (a === pos.length - 1 && b === 0);
      if (skip) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFn(pos[a] + dx, pos[b] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  // version info (v7 ขึ้นไป)
  if (ver >= 7) {
    const vb = versionBits(ver);
    for (let i = 0; i < 18; i++) {
      const bit = getBit(vb, i);
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setFn(a, b, bit); setFn(b, a, bit);
    }
  }
  // จองพื้นที่ format info ไว้ก่อน (ค่าจริงเติมทีหลังตอนรู้ mask)
  const drawFormat = (mask) => {
    const fb = formatBits(mask);
    for (let i = 0; i <= 5; i++) setFn(8, i, getBit(fb, i));
    setFn(8, 7, getBit(fb, 6));
    setFn(8, 8, getBit(fb, 7));
    setFn(7, 8, getBit(fb, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(fb, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(fb, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(fb, i));
    setFn(8, size - 8, true); // dark module
  };
  drawFormat(0);

  // 5) ใส่ข้อมูลแบบซิกแซกจากขวาไปซ้าย
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && bi < allCw.length * 8) {
          mod[y][x] = getBit(allCw[bi >>> 3], 7 - (bi & 7));
          bi++;
        }
      }
    }
  }

  // 6) ลอง mask ทั้ง 8 แบบ เลือกอันที่ penalty ต่ำสุด
  let bestMask = 0, bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(mod, isFn, size, m);
    drawFormat(m);
    const p = penalty(mod, size);
    if (p < bestPenalty) { bestPenalty = p; bestMask = m; }
    applyMask(mod, isFn, size, m); // XOR ซ้ำ = ยกเลิก
  }
  applyMask(mod, isFn, size, bestMask);
  drawFormat(bestMask);

  return { size, mod };
}

function applyMask(mod, isFn, size, mask) {
  const fn = MASK_FN[mask];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFn[y][x] && fn(x, y)) mod[y][x] = !mod[y][x];
    }
  }
}

/**
 * สร้าง SVG string ของ QR — ฝังลง HTML ได้เลย
 * @param {string} text ข้อความที่จะเข้ารหัส
 * @param {object} opts { margin: จำนวนช่องขอบขาว (default 2), cls: class ของ <svg> }
 */
export function qrSvg(text, opts = {}) {
  const q = qrMatrix(text);
  if (!q) return '';
  const margin = opts.margin != null ? opts.margin : 2;
  const { size, mod } = q;
  const dim = size + margin * 2;

  // รวมช่องดำที่ติดกันในแถวเดียวกันเป็น <rect> เดียว → SVG เล็กลงมาก
  let rects = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!mod[y][x]) { x++; continue; }
      let w = 1;
      while (x + w < size && mod[y][x + w]) w++;
      rects += `<rect x="${x + margin}" y="${y + margin}" width="${w}" height="1"/>`;
      x += w;
    }
  }
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  return `<svg${cls} viewBox="0 0 ${dim} ${dim}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}
