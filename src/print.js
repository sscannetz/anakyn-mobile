// ═══════════════════════════════════════════════════════════════
// print.js — สร้างเอกสาร HTML สำหรับ "สั่งปริ้น" และ "บันทึก PDF"
// ออกแบบเป็นเอกสารทางการขนาด A4 (ไม่ใช่ภาพหน้าจอ) — ทุกเอกสารใช้เทมเพลตเดียวกัน
//   • print*  → เปิด print dialog (เว็บ: iframe / มือถือ: print sheet)
//   • save*   → เว็บ: print dialog (เลือก Save as PDF) | มือถือ: สร้าง PDF แล้วแชร์/บันทึก
//   หมายเหตุ: print* กับ save* ใช้ HTML ตัวเดียวกัน → output เหมือนกันเป๊ะ
// ═══════════════════════════════════════════════════════════════
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { LOGO_URI } from './logoBase64';
import { qrSvg } from './qr';
import { tagSaleUrl } from './scan';

// ── helper ──
const num = (n) => { const x = Number(n); return Number.isFinite(x) ? x : 0; };
const baht = (n) => '฿' + Math.round(num(n)).toLocaleString('th-TH');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateTH = (v) => { const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('th-TH'); };

// ── ข้อมูลบริษัท (ผู้ออกเอกสาร) ──
const COMPANY = {
  name: 'Anakyn Gems Co., Ltd.',
  addr: '123 ถ.สีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
};

const STYLE = `
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', -apple-system, 'Helvetica Neue', Arial, sans-serif; color:#2b2226; font-size:12px; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  /* สูงอย่างน้อยเกือบเต็มหน้า A4 (269mm − ขอบล่างกันไว้) + เป็น flex column
     → .signs ใช้ margin-top:auto ดันตัวเองกับ .foot ลงไปอยู่ท้ายหน้าเสมอ
     เอกสารที่มีไม่กี่รายการจะได้ไม่ลอยค้างกลางหน้า */
  .doc { width:100%; max-width:780px; margin:0 auto; min-height:265mm; display:flex; flex-direction:column; }

  /* ── หัวเอกสาร ── */
  .hd { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:2.5px solid #550a19; }
  .logo { height:88px; width:auto; display:block; }
  .company { font-size:10px; color:#8a7d83; margin-top:8px; line-height:1.6; max-width:230px; }
  .title-wrap { text-align:right; }
  .title { font-size:22px; font-weight:800; color:#550a19; letter-spacing:1px; line-height:1; }
  .docno { font-size:12px; color:#6b5f64; margin-top:7px; }
  .docno b { color:#2b2226; font-weight:700; }

  /* ── แถบข้อมูล (วันที่ / อ้างอิง / VAT) ── */
  .meta { display:flex; margin-top:14px; border:1px solid #e6d7dc; border-radius:7px; overflow:hidden; }
  .meta > div { flex:1; padding:9px 13px; border-right:1px solid #f1e8eb; }
  .meta > div:last-child { border-right:none; }
  .ml { font-size:9px; letter-spacing:.5px; color:#9a6b78; text-transform:uppercase; }
  .mv { font-size:12px; font-weight:600; color:#2b2226; margin-top:2px; }

  /* ── คู่สัญญา (ผู้ขาย / ลูกค้า) ── */
  .parties { display:flex; gap:14px; margin-top:14px; }
  .party { flex:1; border:1px solid #e6d7dc; border-radius:7px; padding:12px 15px; }
  .pl { font-size:9px; letter-spacing:1px; color:#9a6b78; text-transform:uppercase; margin-bottom:6px; }
  .pn { font-size:13px; font-weight:700; color:#2b2226; }
  .ps { font-size:11px; color:#8a7d83; margin-top:3px; line-height:1.6; }

  /* ── ส่วน/หัวข้อ ── */
  .sec { margin-top:18px; }
  .sl { font-size:10px; font-weight:700; letter-spacing:1px; color:#550a19; text-transform:uppercase; margin-bottom:9px; padding-bottom:5px; border-bottom:1px solid #ece1e4; }

  /* ── ตารางรายการ ── */
  table { width:100%; border-collapse:collapse; }
  thead th { background:#550a19; color:#fbeef1; font-size:10px; font-weight:600; letter-spacing:.5px; text-align:left; padding:9px 11px; }
  thead th.r { text-align:right; } thead th.c { text-align:center; }
  tbody td { padding:9px 11px; border-bottom:1px solid #efe7ea; font-size:12px; vertical-align:top; }
  tbody tr:nth-child(even) td { background:#faf5f6; }
  tbody tr:last-child td { border-bottom:1px solid #e6d7dc; }
  .r { text-align:right; } .c { text-align:center; }
  .iname { font-weight:600; color:#2b2226; }
  .isub { font-size:10px; color:#a99ca2; margin-top:2px; }
  .price { font-weight:700; color:#550a19; }
  .muted { color:#a99ca2; }

  /* ── ยอดรวม (ชิดขวา) ── */
  .totals { display:flex; justify-content:flex-end; margin-top:15px; }
  .totals-box { width:300px; }
  .trow { display:flex; justify-content:space-between; padding:6px 12px; font-size:12px; color:#6b5f64; }
  .trow b { color:#2b2226; font-weight:600; }
  .grand { display:flex; justify-content:space-between; align-items:center; padding:13px 15px; margin-top:7px; background:#fff; border:2px solid #550a19; border-radius:7px; }
  .grand .gl { font-size:12px; color:#550a19; font-weight:600; letter-spacing:.5px; }
  .grand .gv { font-size:19px; font-weight:800; color:#550a19; }

  /* ── กล่องข้อมูล (เช่น สินค้าที่ซ่อม / อาการ) ── */
  .fields { border:1px solid #e6d7dc; border-radius:7px; overflow:hidden; }
  .field { display:flex; padding:9px 13px; border-bottom:1px solid #f1e8eb; }
  .field:last-child { border-bottom:none; }
  .field .fl { width:130px; font-size:11px; color:#9a6b78; }
  .field .fv { flex:1; font-size:12px; font-weight:600; color:#2b2226; }

  /* ── ช่องเซ็น ── */
  /* ทุกอย่างใน .bottom-block ยึดท้ายหน้าเป็นก้อนเดียว
     ใบสั่งซ่อมใส่ตารางรายการ + ยอดรวมเข้ามาด้วย เอกสารอื่นมีแค่ลายเซ็น */
  .bottom-block { margin-top:auto; }
  .signs { display:flex; gap:50px; margin-top:46px; }
  .sign { flex:1; text-align:center; }
  .sign-line { border-top:1px dotted #b3a3a9; margin:0 6px; }
  .sign-label { font-size:11px; font-weight:600; color:#5a4f54; margin-top:7px; }
  .sign-sub { font-size:9px; color:#b3a3a9; margin-top:3px; }

  /* ── ท้ายเอกสาร ── */
  .foot { margin-top:24px; padding-top:11px; border-top:1px solid #ece1e4; text-align:center; font-size:9px; color:#b3a3a9; line-height:1.7; }

  @media print { .doc { max-width:100%; } }
`;

// ── ตารางรายการ (โครงเดียวกันทุกเอกสาร) ──
function table(cols, bodyRows) {
  const head = cols.map((c) => `<th class="${c.align || ''}">${esc(c.label)}</th>`).join('');
  const empty = `<tr><td colspan="${cols.length}" class="c muted">— ไม่มีรายการ —</td></tr>`;
  return `<table><thead><tr>${head}</tr></thead><tbody>${bodyRows || empty}</tbody></table>`;
}

// ── บล็อกยอดรวม (ชิดขวา + ยอดรวมทั้งสิ้นเด่น) ──
function totals(rows, grandLabel, grandValue) {
  const tr = rows.map(([l, v]) => `<div class="trow"><span>${esc(l)}</span><b>${v}</b></div>`).join('');
  return `<div class="totals"><div class="totals-box">${tr}
    <div class="grand"><span class="gl">${esc(grandLabel)}</span><span class="gv">${grandValue}</span></div></div></div>`;
}

// ── แม่แบบเอกสาร ──
function renderDoc({ badge, docNo, meta = [], parties, sections = '', sectionsBottom = '', signatures }) {
  const metaHtml = meta.length
    ? `<div class="meta">${meta.map(([l, v]) => `<div><div class="ml">${esc(l)}</div><div class="mv">${esc(v)}</div></div>`).join('')}</div>`
    : '';
  const partiesHtml = parties
    ? `<div class="parties">${[parties.seller, parties.buyer].filter(Boolean).map((p) =>
        `<div class="party"><div class="pl">${esc(p.label)}</div><div class="pn">${esc(p.name || 'ไม่ระบุ')}</div>${p.sub ? `<div class="ps">${esc(p.sub)}</div>` : ''}</div>`
      ).join('')}</div>`
    : '';
  const signHtml = (signatures && signatures.length)
    ? `<div class="signs">${signatures.map((s) =>
        `<div class="sign"><div class="sign-line"></div><div class="sign-label">${esc(s.label)}</div><div class="sign-sub">${esc(s.sub || 'วันที่ ......./......./.......')}</div></div>`
      ).join('')}</div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" /><style>${STYLE}</style></head>
    <body><div class="doc">
      <div class="hd">
        <div>
          <img class="logo" src="${LOGO_URI}" alt="ANAKYN GEMS" />
          <div class="company">${esc(COMPANY.name)}<br/>${esc(COMPANY.addr)}</div>
        </div>
        <div class="title-wrap">
          <div class="title">${esc(badge)}</div>
          <div class="docno">เลขที่ <b>${esc(docNo || '—')}</b></div>
        </div>
      </div>
      ${metaHtml}
      ${partiesHtml}
      ${sections}
      <div class="bottom-block">${sectionsBottom}${signHtml}</div>
      <div class="foot">เอกสารนี้ออกจากระบบ Anakyn Gems · ${esc(COMPANY.name)} · พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}</div>
    </div></body></html>`;
}

// ── actions ──
// เว็บ: expo-print เรียก window.print() ปริ้น "ทั้งหน้าเว็บ" (ติดปุ่ม/เมนูมาด้วย)
// จึง render เอกสารลง iframe ซ่อน แล้วสั่งปริ้นเฉพาะ iframe → ได้เฉพาะเอกสาร A4 สะอาดๆ
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));  // iPadOS แกล้งเป็น Mac

// ── iOS/Safari: ปริ้น iframe ไม่ได้ (ต้องเห็น iframe + ต้องเรียกจาก user gesture ตรงๆ) ──
// จึงฝังเอกสารลงหน้าปัจจุบัน แล้วใช้ window.print() ของหน้าหลัก + @media print ซ่อนตัวแอปไว้
function webPrintInPage(html) {
  const css  = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || [, ''])[1];
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [, html])[1];

  const holder = document.createElement('div');
  holder.id = 'anakyn-print-root';
  holder.innerHTML = body;

  const style = document.createElement('style');
  style.id = 'anakyn-print-style';
  style.textContent = `
    #anakyn-print-root { display: none; }
    @media print {
      ${css}
      body > *:not(#anakyn-print-root) { display: none !important; }
      #anakyn-print-root { display: block !important; }
      html, body { background:#fff !important; margin:0 !important; padding:0 !important;
                   height:auto !important; overflow:visible !important; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(holder);

  let done = false;
  const cleanup = () => {
    if (done) return; done = true;
    try { style.remove(); holder.remove(); } catch (e) {}
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 60000);   // เผื่อ iOS ไม่ยิง afterprint

  window.print();               // เรียกทันที ไม่หน่วง เพื่อคง user gesture
}

// ── เดสก์ท็อป/Android: ใช้ iframe (แยกเอกสารออกจากหน้าแอปสะอาดกว่า) ──
function webPrint(html) {
  if (isIOS()) return webPrintInPage(html);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0' });
  document.body.appendChild(iframe);
  const cw = iframe.contentWindow;
  cw.document.open();
  cw.document.write(html);
  cw.document.close();
  setTimeout(() => {
    try { cw.focus(); cw.print(); } catch (e) { try { webPrintInPage(html); } catch (_) {} }
    setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) {} }, 1000);
  }, 400);
}

async function printHtml(html) {
  if (Platform.OS === 'web') { try { webPrint(html); } catch (e) {} return; }
  try { await Print.printAsync({ html }); }
  catch (e) { console.log('print cancelled', e?.message); }
}
async function savePdf(html) {
  if (Platform.OS === 'web') { try { webPrint(html); } catch (e) {} return; }
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'บันทึก / แชร์ PDF' });
    else await Print.printAsync({ html });
  } catch (e) { try { await Print.printAsync({ html }); } catch (_) {} }
}

const SELLER = { label: 'ผู้ขาย', name: COMPANY.name, sub: COMPANY.addr };

// ══════════ builders (คืน html) ══════════
function buildStock(items = []) {
  const rows = items.map((p, i) => {
    const qty = num(p.stock_qty), price = num(p.sale_price);
    return `<tr><td class="c">${i + 1}</td><td><span class="iname">${esc(p.name)}</span><div class="isub">${esc(p.sku)}</div></td>
      <td class="c">${qty}</td><td class="r">${baht(price)}</td><td class="r price">${baht(qty * price)}</td></tr>`;
  }).join('');
  const totalQty = items.reduce((s, p) => s + num(p.stock_qty), 0);
  const totalVal = items.reduce((s, p) => s + num(p.stock_qty) * num(p.sale_price), 0);
  const sections = `<div class="sec"><div class="sl">รายการสินค้าคงคลัง (${items.length} รายการ)</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'สินค้า' }, { label: 'จำนวน', align: 'c' }, { label: 'ราคา/ชิ้น', align: 'r' }, { label: 'มูลค่ารวม', align: 'r' }],
      rows
    )}</div>
    ${totals([['จำนวนรวม', `${totalQty} ชิ้น`]], 'มูลค่าคงคลังรวม', baht(totalVal))}`;
  return renderDoc({ badge: 'รายงานสต๊อกสินค้า', docNo: new Date().toLocaleDateString('th-TH'), sections });
}

function buildInvoice(inv = {}) {
  const rows = (inv.items || []).map((it, i) => {
    const qty = num(it.qty) || 1;
    const unit = it.unit_price ?? it.line_total;
    const amt = it.line_total ?? (qty * num(unit));
    return `<tr><td class="c">${i + 1}</td>
      <td><span class="iname">${esc(it.product_name || it.name || 'รายการ')}</span>${it.sku ? `<div class="isub">${esc(it.sku)}</div>` : ''}</td>
      <td class="c">${qty}</td><td class="r">${baht(unit)}</td><td class="r price">${baht(amt)}</td></tr>`;
  }).join('');
  const sections = `<div class="sec"><div class="sl">รายการสินค้า</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'รายการ' }, { label: 'จำนวน', align: 'c' }, { label: 'ราคา/หน่วย', align: 'r' }, { label: 'จำนวนเงิน', align: 'r' }],
      rows
    )}</div>`;
  // ยอดรวมเกาะท้ายกระดาษพร้อมลายเซ็น เหมือนใบสั่งซ่อม
  const sectionsBottom = totals(
    [['รวมค่าสินค้า', baht(inv.subtotal ?? inv.grand_total)]],
    'ยอดรวมทั้งสิ้น', baht(inv.grand_total)
  );
  return renderDoc({
    badge: 'ใบกำกับภาษี', docNo: inv.invoice_no,
    meta: [['วันที่', dateTH(inv.issued_at)], ['อ้างอิงการขาย', inv.sale_no || '—']],
    parties: { seller: SELLER, buyer: { label: 'ลูกค้า / ผู้ซื้อ', name: inv.customer_name, sub: inv.customer_phone } },
    sections, sectionsBottom,
    signatures: [{ label: 'ผู้รับสินค้า' }, { label: 'ผู้มีอำนาจลงนาม' }],
  });
}

function buildQuotation(qt = {}) {
  const rows = (qt.items || []).map((it, i) => {
    const qty = num(it.qty) || 1;
    const unit = it.unit_price ?? it.price;
    return `<tr><td class="c">${i + 1}</td>
      <td class="iname">${esc(it.name || it.product_name || `รายการที่ ${i + 1}`)}</td>
      <td class="c">${qty}</td><td class="r">${baht(unit)}</td><td class="r price">${baht(qty * num(unit))}</td></tr>`;
  }).join('');
  const sections = `<div class="sec"><div class="sl">รายการสินค้า / บริการ</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'รายการ' }, { label: 'จำนวน', align: 'c' }, { label: 'ราคา/หน่วย', align: 'r' }, { label: 'จำนวนเงิน', align: 'r' }],
      rows
    )}</div>`;
  const sectionsBottom = `${totals(
      [['รวมค่าสินค้า', baht(qt.subtotal ?? qt.grand_total)]],
      'ยอดรวมทั้งสิ้น', baht(qt.grand_total)
    )}
    ${qt.notes ? `<div class="sec"><div class="sl">หมายเหตุ</div><div class="ps">${esc(qt.notes)}</div></div>` : ''}`;
  return renderDoc({
    badge: 'ใบเสนอราคา', docNo: qt.quote_no || qt.quotation_no,
    meta: [['วันที่', dateTH(qt.created_at || qt.issued_at)], ['ยืนราคาถึง', qt.valid_until ? dateTH(qt.valid_until) : '—']],
    parties: { seller: { ...SELLER, label: 'ผู้เสนอราคา' }, buyer: { label: 'ลูกค้า', name: qt.customer_name, sub: qt.phone } },
    sections, sectionsBottom,
    signatures: [{ label: 'ผู้เสนอราคา' }, { label: 'ผู้อนุมัติ / ลูกค้า' }],
  });
}

function buildPO(po = {}) {
  const rows = (po.items || []).map((it, i) => {
    const qty = num(it.qty);
    const unit = it.unit_price ?? it.price;
    return `<tr><td class="c">${i + 1}</td>
      <td class="iname">${esc(it.item_name || it.name)}</td>
      <td class="c">${qty}${it.unit ? ' ' + esc(it.unit) : ''}</td>
      <td class="r">${baht(unit)}</td>
      <td class="r price">${baht(it.line_total ?? (qty * num(unit)))}</td></tr>`;
  }).join('');
  const sections = `<div class="sec"><div class="sl">รายการสั่งซื้อ</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'รายการ' }, { label: 'จำนวน', align: 'c' }, { label: 'ราคา/หน่วย', align: 'r' }, { label: 'จำนวนเงิน', align: 'r' }],
      rows
    )}</div>`;
  const sectionsBottom = `${totals(
      [['รวมค่าสินค้า', baht(po.subtotal ?? po.total)]],
      'ยอดรวมทั้งสิ้น', baht(po.total)
    )}
    ${po.notes ? `<div class="sec"><div class="sl">หมายเหตุ</div><div class="ps">${esc(po.notes)}</div></div>` : ''}`;
  return renderDoc({
    badge: 'ใบสั่งซื้อ', docNo: po.po_no,
    meta: [['วันที่', dateTH(po.created_at)], ['ต้องการภายใน', po.needed_by ? dateTH(po.needed_by) : '—']],
    parties: { seller: { label: 'ผู้ขาย (ซัพพลายเออร์)', name: po.supplier_name, sub: po.phone }, buyer: { ...SELLER, label: 'ผู้สั่งซื้อ' } },
    sections, sectionsBottom,
    signatures: [{ label: 'ผู้สั่งซื้อ' }, { label: 'ผู้อนุมัติ' }],
  });
}

// ── ใบสั่งซ่อม — ใช้หน้าตาชุดเดียวกับใบสั่งทำ (ตาราง + รูป 4 รูป + จัดกลุ่มตามลูกค้า) ──
// ตัวช่วย woPics / groupByCustomer / WO_STYLE อยู่ในบล็อกใบสั่งทำท้ายไฟล์
// เรียกข้ามได้เพราะตอนถูกเรียกใช้จริง โมดูลโหลดครบแล้ว
function soDetail(so = {}) {
  const title = [esc(so.job_type || 'งานซ่อม'),
    num(so.job_qty) > 1 ? `${esc(so.job_qty)} ชิ้น` : ''].filter(Boolean).join(' · ');
  return `<div class="dl">
    <div class="d0">${title}</div>
    ${so.repair_detail ? `<div class="d1">${esc(so.repair_detail)}</div>` : ''}
    ${so.note ? `<div class="d3">${esc(so.note)}</div>` : ''}
  </div>`;
}

function soPage(orders) {
  const list = Array.isArray(orders) ? orders : [orders];
  const blank = list.length === 1 && list[0].blank;
  const head = list[0] || {};

  const rows = blank
    ? [1, 2, 3, 4].map((i) => `<tr>
        <td class="no">${i}</td><td class="pic">${woPics({}, true)}</td>
        <td class="code">&nbsp;</td><td style="height:64px"></td><td class="amt">&nbsp;</td>
      </tr>`)
    : list.map((so, i) => `<tr>
        <td class="no">${i + 1}</td>
        <td class="pic">${woPics(so, false)}</td>
        <td class="code">${esc(so.service_no || '—')}</td>
        <td>${soDetail(so)}</td>
        <td class="amt">${num(so.price) ? money(so.price) : '—'}</td>
      </tr>`);

  const price = list.reduce((sum, o) => sum + num(o.price), 0);
  const deposit = list.reduce((sum, o) => sum + num(o.deposit), 0);

  return `<div class="doc">
    <div class="stripe">
      <div>${esc(COMPANY.name)}</div>
      <div class="mid">ใบสั่งซ่อม · SERVICE ORDER</div>
      <div>${esc(COMPANY.addr).slice(0, 40)}</div>
    </div>

    <div class="head">
      <div class="kv">
        <div class="k">ลูกค้า</div><div class="v ${blank || !head.customer_name ? 'blank' : ''}">${blank || !head.customer_name ? '&nbsp;' : esc(head.customer_name)}</div>
        <div class="k">เบอร์โทร</div><div class="v ${blank || !head.customer_phone ? 'blank' : ''}">${blank || !head.customer_phone ? '&nbsp;' : esc(head.customer_phone)}</div>
        <div class="k">วันที่รับงาน</div><div class="v">${blank || !head.received_at ? DOTS : woDate(head.received_at)}</div>
        <div class="k">วันที่ส่งงาน</div><div class="v">${blank || !head.due_date ? DOTS : woDate(head.due_date)}</div>
      </div>
      <div class="brand">
        <img class="brandlogo" src="${LOGO_URI}" alt="ANAKYN GEMS" />
        <div class="stamp">${blank ? 'ใบเปล่า — กรอกด้วยมือ' : `${list.length} งาน`}</div>
      </div>
    </div>

    <table class="jobs">
      <thead><tr>
        <th class="c">No.</th><th>รูป</th><th>รหัสงานซ่อม</th><th>รายละเอียด</th><th class="r">ราคา (บาท)</th>
      </tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>

    <div class="bottom-block">
      <div class="sum"><div class="sumtbl">
        <div class="sumrow total"><div class="lbl">ราคา</div>
          <div class="val">${blank ? '&nbsp;' : money(price)}</div></div>
        <div class="sumrow paid"><div class="lbl">มัดจำ</div>
          <div class="val">${blank ? '&nbsp;' : money(deposit)}</div></div>
        <div class="sumrow bal"><div class="lbl">รวม</div>
          <div class="val">${blank ? '&nbsp;' : money(Math.max(0, price - deposit))}</div></div>
      </div></div>

      <div class="signs">
        <div class="sign"><div class="gap"></div><div class="sline"></div>
          <div class="slabel">${blank || !head.customer_name ? 'ลูกค้า' : esc(head.customer_name)}</div>
          <div class="ssub">วันที่ ${DOTS}</div></div>
        <div class="sign"><div class="gap"></div><div class="sline"></div>
          <div class="slabel">${blank || !head.received_by ? 'ผู้รับออเดอร์' : esc(head.received_by)}</div>
          <div class="ssub">วันที่ ${DOTS}</div></div>
      </div>

      <div class="foot">ใบสั่งซ่อม · ${esc(COMPANY.name)} · เอกสารฉบับนี้ใช้ประกอบการรับงานและส่งมอบงานเท่านั้น</div>
    </div>
  </div>`;
}

function buildServiceOrder(input) {
  const list = Array.isArray(input) ? input : [input || {}];
  const pages = list.length === 1 && list[0].blank
    ? [soPage(list[0])]
    : groupByCustomer(list).map(soPage);
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${WO_STYLE}</style></head><body>${pages.join('')}</body></html>`;
}

const PAY_LABELS = { cash: 'เงินสด', transfer: 'โอนเงิน', card: 'บัตรเครดิต', other: 'อื่นๆ' };

function buildReceipt(rc = {}) {
  const rows = (rc.items || []).map((it, i) => {
    const qty = num(it.qty) || 1;
    const unit = it.unit_price ?? it.line_total;
    const amt = it.line_total ?? (qty * num(unit));
    return `<tr><td class="c">${i + 1}</td>
      <td><span class="iname">${esc(it.product_name || it.name || 'รายการ')}</span>${it.sku ? `<div class="isub">${esc(it.sku)}</div>` : ''}</td>
      <td class="c">${qty}</td><td class="r">${baht(unit)}</td><td class="r price">${baht(amt)}</td></tr>`;
  }).join('');
  const amount = rc.amount ?? rc.grand_total ?? rc.total;
  const sections = `<div class="sec"><div class="sl">รายการสินค้า</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'รายการ' }, { label: 'จำนวน', align: 'c' }, { label: 'ราคา/หน่วย', align: 'r' }, { label: 'จำนวนเงิน', align: 'r' }],
      rows
    )}</div>`;
  const sectionsBottom = `${totals(
      [['ชำระโดย', PAY_LABELS[rc.payment_method] || rc.payment_method || '—']],
      'จำนวนเงินที่รับ', baht(amount)
    )}
    ${rc.note ? `<div class="sec"><div class="sl">หมายเหตุ</div><div class="ps">${esc(rc.note)}</div></div>` : ''}`;
  return renderDoc({
    badge: 'ใบเสร็จรับเงิน', docNo: rc.receipt_no,
    meta: [['วันที่', dateTH(rc.issued_at)], ['อ้างอิงการขาย', rc.sale_no || '—']],
    parties: { seller: { ...SELLER, label: 'ผู้รับเงิน' }, buyer: { label: 'ผู้ชำระเงิน', name: rc.customer_name, sub: rc.phone } },
    sections, sectionsBottom,
    signatures: [{ label: 'ผู้รับเงิน' }, { label: 'ผู้ชำระเงิน' }],
  });
}

function buildSummary(d = {}, periodLabel = '') {
  const kpi = [
    ['ยอดขาย', baht(d.total_sales)], ['จำนวนออเดอร์', `${num(d.order_count)} รายการ`],
    ['กำไรโดยประมาณ', baht(d.estimated_profit)], ['VAT ที่เก็บ', baht(d.vat_collected)],
  ].map(([l, v]) => `<div class="field"><div class="fl">${esc(l)}</div><div class="fv">${v}</div></div>`).join('');
  const top = (d.top_items || []).map((it, i) =>
    `<tr><td class="c">${i + 1}</td><td class="iname">${esc(it.name)}</td><td class="isub">${esc(it.sku)}</td>
      <td class="c">${num(it.qty)}</td><td class="r price">${baht(it.amount)}</td></tr>`).join('');
  const pending = [
    ['PO ค้างอยู่', num(d.pending_po)], ['งานซ่อมค้าง', num(d.pending_service)], ['ใบเสนอราคาค้าง', num(d.pending_quotation)],
  ].map(([l, v]) => `<div class="field"><div class="fl">${esc(l)}</div><div class="fv">${v}</div></div>`).join('');
  const sections = `<div class="sec"><div class="sl">ตัวชี้วัดหลัก</div><div class="fields">${kpi}</div></div>
    <div class="sec"><div class="sl">สินค้าขายดี</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'สินค้า' }, { label: 'SKU' }, { label: 'ขาย', align: 'c' }, { label: 'ยอด', align: 'r' }],
      top
    )}</div>
    <div class="sec"><div class="sl">รายการค้างอยู่</div><div class="fields">${pending}</div></div>`;
  return renderDoc({ badge: 'สรุปรายงาน', docNo: periodLabel || new Date().toLocaleDateString('th-TH'), sections });
}

// ═══════════════════════════════════════════════════════════════
// ป้ายติดสินค้า (Product Tag) — 50 × 15 มม. "พับครึ่ง" ได้ 2 หน้า (หน้าละ 25 × 15 มม.)
//   ซ้าย  = หน้าหลัก : QR + ชื่อสินค้า (ชิดบน) + ราคา (ชิดล่าง) — ทั้งหมดอยู่ในแนวขอบ QR
//   ขวา   = หน้าสเปก  : ANAKYN#xxxx / WG: 18K X.XXg / D: {จำนวน}/{กะรัตรวม}ct ({รูปทรง})
//   ใช้กับเครื่องพิมพ์ฉลาก เช่น TSC TTP-345 (300 dpi) — ตั้ง paper size = 50×15 มม.
//   1 ป้าย = 1 หน้ากระดาษ (page-break) · สีดำล้วนล้วนเพื่อความคมบนหัวพิมพ์ความร้อน
// ═══════════════════════════════════════════════════════════════
// ── ขนาดป้ายจริง ──
// ป้าย 1 ใบยาว 100 มม. = หัวที่พิมพ์ได้ 50×15 มม. + หางบางสำหรับพันรอบสินค้า 50×2 มม.
// หน้ากระดาษต้องกว้าง 100 มม. (เท่าป้ายทั้งใบ) ไม่งั้นระบบจะพิมพ์คร่อมป้าย เนื้อหาไปตกบนหาง
const TAG_PAGE_W = 100;           // ความกว้างหน้ากระดาษ = ความยาวป้ายทั้งใบ (มม.)
const TAG_W = 50, TAG_H = 15;     // หัวป้าย 50 มม. · ระยะ feed ต่อ 1 ป้าย 15 มม.
const TAG_HEAD_SIDE = 'right';    // หัวป้ายอยู่ครึ่งไหนของแผ่น: 'right' | 'left'

// ★ ตำแหน่งเส้นพับ วัดจากขอบ "ต้นทาง" ของหัวป้าย (มม.) — ค่ากลางคือ 25
//   ใช้เมื่อรอยพับจริงบนป้ายไม่ได้อยู่กึ่งกลางเป๊ะ หรือพื้นที่พิมพ์เยื้องไปข้างใดข้างหนึ่ง
//   ลดเลข = เส้นเลื่อนไปทางแผง QR · เพิ่มเลข = เส้นเลื่อนไปทางแผงสเปก
//   ปรับทีละ 0.5–1 มม. แล้วพิมพ์เทียบกับรอยพับจริง
const TAG_FOLD_X = 25;
const TAG_PNL_A = TAG_FOLD_X;         // ความกว้างแผง QR + ชื่อ + ราคา
const TAG_PNL_B = TAG_W - TAG_FOLD_X; // ความกว้างแผงสเปก

// ★ ความสูงที่พิมพ์ติดจริง — วัดด้วย tag-window-test.html แล้ว = 12 มม.
//   (กรอบ 13 ขอบล่างขาด · กรอบ 12 ครบทั้งบน-ล่าง)
//   เกินกว่านี้ offset ช่วยไม่ได้ — เลื่อนขึ้นก็ตัดหัว เลื่อนลงก็ตัดท้าย
const TAG_BODY_H = 11;

// ★ เลื่อนเนื้อหาขึ้น-ลง (มม.) — ชดเชยกรณีเครื่องพิมพ์วางภาพเยื้องจากตำแหน่งจริง
//   ค่าลบ = เลื่อนขึ้น · ค่าบวก = เลื่อนลง · 0 = ไม่ชดเชย
//   ⚠ ใช้ "ปุ่มเดียว" เท่านั้น — ถ้าตั้ง offset ที่ไดรเวอร์เครื่องพิมพ์แล้ว ให้ค่านี้เป็น 0
//     ไม่งั้นจะชดเชยซ้อนกัน 2 ชั้น แล้วเนื้อหาจะเลื่อนขึ้นเกินจนบรรทัดบนโดนตัด
const TAG_SHIFT_Y = 0;

// ★ กลับหัวป้าย 180° แล้ววางเนื้อหาชิดขอบ "ล่าง" ของหน้า
//   ใช้แก้กรณีหัวพิมพ์กินขอบบนของป้าย (ขอบล่างพิมพ์ติดปกติ)
//   พลิกแล้วบรรทัดที่เคยโดนตัดจะย้ายมาอยู่โซนที่พิมพ์ติด — ไม่ต้องย่อฟอนต์ ไม่เสียพื้นที่
//   ตั้ง false = กลับไปแบบเดิม (ตั้งตรง ชิดขอบบน)
const TAG_FLIP = true;

const TAG_PAD_X = 1.1;            // padding ซ้าย-ขวาของแต่ละแผง
const TAG_QR = 9.6;               // ขนาด QR (มม.) — ต้องไม่เกิน TAG_BODY_H ลบ padding (11 − 1.4)
// คำนวณจาก TAG_FOLD_X ให้อัตโนมัติ — ขยับเส้นพับแล้วคอลัมน์ข้อความปรับตามเอง
const TAG_COL  = +(TAG_PNL_A - TAG_PAD_X * 2 - TAG_QR - 0.8).toFixed(2); // คอลัมน์ชื่อ+ราคา ข้าง QR
const TAG_RCOL = +(TAG_PNL_B - TAG_PAD_X * 2).toFixed(2);                // ความกว้างแผงสเปก
const TAG_RH = TAG_BODY_H - 1.4;  // ความสูงใช้งานของแผง (หัก padding บน-ล่าง)
const TAG_FOLD_LINE = false;      // เส้นประช่วยพับ — ปิดไว้ (ตั้ง true ถ้าอยากให้แสดงอีกครั้ง)
// ── เครื่องหมาย "มีใบเซอร์" ต่อท้ายชื่อสินค้า ────────────────
// ใช้ \u25CF (●) วงกลมทึบแบบตัวอักษร ไม่ใช่ emoji \u26AB (⚫)
// เพราะ emoji เป็นฟอนต์สี เครื่องพิมพ์ความร้อนขาวดำแปลงแล้วขอบแตก
// และ emoji ไม่เคารพขนาด/น้ำหนักฟอนต์ เลย์เอาต์ที่คำนวณไว้จะเพี้ยน
// ● เป็นตัวอักษรปกติ คมทุกขนาด ทุกฟอนต์ ทั้งเว็บ PDF และเครื่องพิมพ์
export const CERT_MARK  = '\u25CF';
// ● ตัวเต็มกินพื้นที่กว้างกว่า * หรือ • มาก จึงย่อลงไม่ให้ข่มชื่อสินค้า
export const CERT_SCALE = 0.85;
const TAG_DGAP = 0.5;             // ช่องไฟระหว่าง 2 คอลัมน์ของรายการเพชร (มม.)
const TAG_D_2COL_MIN = 4;         // เพชรกี่ช่องขึ้นไปถึงจะแตกเป็น 2 คอลัมน์

const TAG_STYLE = `
  @page { size: ${TAG_PAGE_W}mm ${TAG_H}mm; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${TAG_PAGE_W}mm; }
  body { font-family:'Sarabun', -apple-system, 'Helvetica Neue', Arial, sans-serif;
         color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* 1 หน้า = ป้าย 1 ใบ (100 มม.) — เว้นครึ่งที่เป็นหางไว้ว่าง พิมพ์เฉพาะบนหัว
     ★ align-items:center = จัดกึ่งกลางแนวตั้งเสมอ (ทั้งโหมดปกติและกลับหัว)
       หัวพิมพ์กินขอบบนและขอบล่างข้างละ ~1.5 มม. — จัดกึ่งกลางแล้ว
       เนื้อหา 12 มม. จะมีระยะกันชนเท่ากันทั้งสองด้าน ไม่โดนตัดฝั่งไหนเลย
       (ห้ามใช้ flex-start/flex-end เพราะจะดันเนื้อหาเข้าโซนที่พิมพ์ไม่ติด) */
  .page { width:${TAG_PAGE_W}mm; height:${TAG_H}mm; display:flex; align-items:center;
          overflow:hidden; page-break-after:always; break-after:page; }
  .page:last-child { page-break-after:auto; break-after:auto; }
  .tail { width:${TAG_PAGE_W - TAG_W}mm; height:${TAG_BODY_H}mm; flex:0 0 auto; }
  /* TAG_FLIP หมุน 180° รอบจุดกึ่งกลางตัวเอง → ยังอยู่ครึ่งเดิมของแผ่น แค่พลิกหัวกลับ
     TAG_SHIFT_Y ใช้ position:relative เพื่อให้เลื่อนได้แม่นยำโดยไม่กวนการจัดกึ่งกลาง */
  .tag  { width:${TAG_W}mm; height:${TAG_BODY_H}mm; display:flex; overflow:hidden; flex:0 0 auto;
          position:relative; top:${TAG_SHIFT_Y}mm;
          ${TAG_FLIP
            ? `-webkit-transform:rotate(180deg); transform:rotate(180deg);
               -webkit-transform-origin:center center; transform-origin:center center;`
            : ''} }
  .pnl   { height:${TAG_BODY_H}mm; padding:0.7mm ${TAG_PAD_X}mm; overflow:hidden; flex:0 0 auto; }
  .pnl.a { width:${TAG_PNL_A}mm; }
  .pnl.b { width:${TAG_PNL_B}mm; }
  /* เส้นพับอยู่กลางป้ายเสมอ → เกาะกับแผงตัวแรกใน DOM ไม่ผูกกับ .pnl.a
     (โหมดกลับหัวจะสลับลำดับแผง เส้นพับต้องย้ายตาม ไม่งั้นไปโผล่ขอบนอก) */
  ${TAG_FOLD_LINE ? `.tag > .pnl:first-child { border-right:0.1mm dotted #000; }` : ''}

  /* ── หน้าหลัก: QR + ชื่อสินค้า + ราคา ──
     คอลัมน์ข้าง QR สูงเท่า QR เป๊ะ → ชื่อชิดขอบบน / ราคาชิดขอบล่าง ของ QR พอดี */
  .pnl.a { display:flex; align-items:flex-start; gap:0.8mm; }
  .qr    { width:${TAG_QR}mm; height:${TAG_QR}mm; flex:0 0 ${TAG_QR}mm; display:block; }
  .acol  { flex:1; min-width:0; height:${TAG_QR}mm;
           display:flex; flex-direction:column; justify-content:space-between; }
  .nm    { font-weight:700; line-height:1.18; overflow:hidden; word-break:break-word;
           display:-webkit-box; -webkit-box-orient:vertical; }
  .pr    { font-weight:800; line-height:1.2; white-space:nowrap; overflow:hidden; }
  /* วงกลมทึบหลังชื่อ = สินค้ามีใบเซอร์ (เดิมเป็นคำว่า "มีใบเซอร์" บรรทัดแยก กินที่ 2.3 มม.)
     ขนาดคุมด้วย CERT_SCALE · อยู่กลางบรรทัดเองไม่ต้องขยับแนวตั้ง */
  .cs    { font-size:${CERT_SCALE}em; }

  /* ── หน้าสเปก: ANAKYN#xxxx / WG / D: ... (ขนาดฟอนต์คำนวณต่อใบใน buildTags) ── */
  .pnl.b { display:flex; flex-direction:column; justify-content:flex-start; }
  .cd    { font-weight:700; line-height:1.2; margin-bottom:0.3mm;
           white-space:nowrap; overflow:hidden; }
  .sp    { line-height:1.32; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
           font-variant-numeric:tabular-nums; }
  /* เพชร 4 ช่องขึ้นไป = 2 คอลัมน์ ไล่ซ้ายไปขวาแล้วขึ้นแถวใหม่
     1-3 ช่องยังเป็นคอลัมน์เดียวเหมือนเดิม (.sp ล้วน ๆ) */
  .dgrid { display:flex; flex-wrap:wrap; column-gap:${TAG_DGAP}mm; }
  .dgrid > .sp { flex:0 0 auto; }

  @media print { .tag { page-break-inside:avoid; break-inside:avoid; } }
`;

// ── คำนวณ font-size ให้ข้อความพอดีช่องเป๊ะ (ไม่โดนตัดท้าย) ──
// ประมาณความกว้างตัวอักษรเป็นหน่วย em — เผื่อไว้กว้างกว่าจริง เพราะเครื่องผู้ใช้
// อาจไม่มีฟอนต์ Sarabun แล้วตกไปใช้ Arial ซึ่งกว้างกว่า (เคยทำให้ราคาโดนตัดท้าย)
function textEm(s) {
  let em = 0;
  for (const ch of String(s)) {
    if (ch >= '0' && ch <= '9') em += 0.62;          // ตัวเลข
    else if (ch === ',' || ch === '.') em += 0.32;
    else if (ch === ' ') em += 0.30;
    else if (ch === '฿') em += 0.72;
    else if (ch === '#') em += 0.68;
    else if (ch >= 'A' && ch <= 'Z') em += 0.70;     // ตัวพิมพ์ใหญ่
    else em += 0.60;                                  // ที่เหลือ (รวมไทย)
  }
  return em || 1;
}
// คืน font-size (มม.) ที่ทำให้ข้อความกว้างไม่เกิน maxW (เผื่อขอบ 8%)
const fitFs = (s, maxW, maxFs, minFs) =>
  Math.max(minFs, Math.min(maxFs, (maxW * 0.92) / textEm(s)));

// จำลองการตัดบรรทัดจริงของเบราว์เซอร์ (ตัดที่ช่องว่างก่อน ถ้าคำเดียวยาวเกินค่อยตัดกลางคำ)
// ห้ามคิดแค่ "ความกว้างรวม ÷ ความกว้างช่อง" เพราะจะได้จำนวนบรรทัดน้อยกว่าจริง แล้วชื่อโดนตัดท้าย
function wrapLines(s, colW, fs) {
  const max = colW * 0.94;                     // มม. ต่อบรรทัด
  const w = (t) => textEm(t) * fs;
  const words = String(s).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const spaceW = w(' ');
  let lines = 1, cur = 0;
  for (const word of words) {
    const ww = w(word);
    if (ww > max) {                            // คำเดียวยาวเกินบรรทัด (เช่นภาษาไทยที่ไม่มีช่องว่าง)
      if (cur > 0) { lines++; cur = 0; }
      const need = Math.ceil(ww / max);
      lines += need - 1;
      cur = ww - (need - 1) * max;
      continue;
    }
    const next = cur === 0 ? ww : cur + spaceW + ww;
    if (next <= max) cur = next;
    else { lines++; cur = ww; }
  }
  return lines;
}

// ข้อความที่ตัดหลายบรรทัดได้ — ใช้ได้ถึง maxLines บรรทัด ถ้ายังเกินค่อยลดขนาดฟอนต์ลง
function fitWrapped(s, colW, availH, maxFs, minFs, maxLines = 4) {
  for (let f = maxFs; f >= minFs; f -= 0.05) {
    const lines = wrapLines(s, colW, f);
    if (lines <= maxLines && lines * f * 1.18 <= availH) return { fs: +f.toFixed(2), lines };
  }
  return { fs: minFs, lines: Math.min(maxLines, Math.max(1, Math.floor(availH / (minFs * 1.18)))) };
}

// ── ตัวย่อรูปทรงเพชรแบบสากล (ตรงกับรายการ SHAPES ในหน้าเพิ่มสินค้า) ──
const SHAPE_CODE = {
  'round brilliant': 'RD', 'princess cut': 'PR', 'cushion cut': 'CU', 'emerald cut': 'EM',
  'asscher cut': 'AS', 'radiant cut': 'RA', 'oval cut': 'OV', 'pear cut': 'PS',
  'marquise cut': 'MQ', 'heart cut': 'HS', 'elongated cushion cut': 'ECU',
  'baguette cut': 'BG', 'old mine cut': 'OMC', 'old european cut': 'OEC',
  'rose cut': 'RS', 'trillion cut': 'TR', 'kite cut': 'KT', 'shield cut': 'SH',
  'hexagon cut': 'HX',
};
function shapeCode(s) {
  const k = String(s || '').trim().toLowerCase();
  if (SHAPE_CODE[k]) return SHAPE_CODE[k];
  if (!k) return '';
  // รูปทรงที่ไม่มีในตาราง → ย่อจากอักษรตัวแรกของแต่ละคำ
  return k.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3);
}

// "WG: 18K 4.20g"
function tagWgLine(p) {
  const w = num(p.metal_weight_g ?? p.weight ?? p.metal_weight_adj_g);
  return 'WG: ' + [p.metal_type || '', w ? `${w.toFixed(2)}g` : ''].filter(Boolean).join(' ');
}

// สินค้าชิ้นนี้มีใบเซอร์ไหม — ดูที่คอลัมน์ has_certificate ก่อน
// ถ้าไม่มีค่า (ข้อมูลเก่า) ค่อยไล่ดูรายเม็ดใน diamonds
function tagHasCert(p) {
  if (p.has_certificate === true || p.has_certificate === 'true') return true;
  if (p.has_certificate === false || p.has_certificate === 'false') return false;
  let ds = p.diamonds;
  if (typeof ds === 'string') { try { ds = JSON.parse(ds); } catch (_) { ds = []; } }
  return Array.isArray(ds) && ds.some(d => d && d.hasCert);
}

// ["1/1.00ct (RD)", "10/0.20ct (RD)", ...] — 1 รายการต่อเพชร 1 กลุ่ม
// ไม่ใส่ "D: " มาให้ เพราะโหมด 2 คอลัมน์ใส่แค่ช่องแรกช่องเดียว (ที่แคบ ใส่ทุกช่องไม่พอ)
// จำนวน / น้ำหนักรวมของกลุ่มนั้น (weight ในฐานข้อมูลเป็นน้ำหนักต่อเม็ด จึงคูณด้วยจำนวน)
function tagDiamondLines(p) {
  let ds = p.diamonds;
  if (typeof ds === 'string') { try { ds = JSON.parse(ds); } catch (_) { ds = []; } }
  if (!Array.isArray(ds)) return [];
  return ds
    .filter(d => d && (num(d.qty) || num(d.weight)))
    .map(d => {
      const q = num(d.qty) || 1;
      const ct = num(d.weight) * q;
      const sc = shapeCode(d.shape);
      return `${q}/${ct.toFixed(2)}ct${sc ? ` (${sc})` : ''}`;
    });
}

// ── ช่องรายการเพชรสำหรับแสดงผล — ใช้ร่วมกันทั้งหน้าพิมพ์และตัวอย่างบนจอ ──
// 1-3 ช่อง = คอลัมน์เดียว ใส่ "D: " ทุกบรรทัด
// 4+  ช่อง = 2 คอลัมน์ ใส่ "D: " แค่ช่องแรก (ช่องกว้างแค่ ~11 มม. ใส่ทุกช่องแล้วฟอนต์เล็กจนอ่านไม่ออก)
// ★ กฎนี้ต้องอยู่ที่เดียว ไม่งั้นตัวอย่างบนจอกับของที่พิมพ์จริงจะไม่ตรงกัน
export function tagDiamondCells(p) {
  const raw = tagDiamondLines(p);
  const twoCol = raw.length >= TAG_D_2COL_MIN;
  return {
    twoCol,
    cells: raw.map((d, i) => (twoCol ? (i === 0 ? 'D: ' : '') : 'D: ') + d),
  };
}

// ── คำนวณ "ขนาดตัวอักษร + ช่องที่แสดงได้" ของป้าย 1 ใบ ─────────────
// ★ เจ้าของสูตรตัวจริง — ทั้งหน้าพิมพ์ (buildTags) และตัวอย่างบนจอ (TagPreview)
//   ต้องเรียกตัวนี้ ห้ามคำนวณเอง ไม่งั้นบนจอกับที่พิมพ์ออกมาจะไม่ตรงกัน
//   (เคยพลาดมาแล้ว: บนจอใช้ฟอนต์ตายตัวเลยล้นขอบ ส่วนหน้าพิมพ์ย่อฟอนต์ให้พอดี)
// ทุกค่าที่คืนมีหน่วยเป็นมิลลิเมตร
export function tagLayout(p = {}) {
  // ฝั่งซ้าย: ชื่อ (ชิดบน) + ราคา (ชิดล่าง) ในคอลัมน์สูงเท่า QR
  const prTxt = baht(p.sale_price);
  const prFs  = fitFs(prTxt, TAG_COL, 2.3, 1.35);

  // มีใบเซอร์ = วงกลมทึบต่อท้ายชื่อ (เดิมเป็นคำว่า "มีใบเซอร์" บรรทัดแยก กินความสูง 2.3 มม.)
  const hasCert = tagHasCert(p);
  const nmTxt   = String(p.name || '-');
  // วัดเผื่อด้วยเครื่องหมาย 2 ตัว เพื่อกันพลาด (ของจริงแสดงตัวเดียว)
  const nmMeas  = hasCert ? nmTxt + ' ' + CERT_MARK + CERT_MARK : nmTxt;
  const nmH     = Math.max(1.6, TAG_QR - (prFs * 1.2 + 0.4));
  const nm      = fitWrapped(nmMeas, TAG_COL, nmH, 1.75, 1.05, 5);

  // ฝั่งขวา: ANAKYN#xxxx / WG / รายการเพชร
  const { cells: dCells, twoCol } = tagDiamondCells(p);
  const cellW  = twoCol ? (TAG_RCOL - TAG_DGAP) / 2 : TAG_RCOL;
  const wgTxt  = tagWgLine(p);
  const wgEm   = textEm(wgTxt);
  const cellEm = dCells.length ? Math.max(...dCells.map(textEm)) : 0;
  const rowsNeeded = twoCol ? Math.ceil(dCells.length / 2) : dCells.length;

  // ย่อฟอนต์ลงเรื่อย ๆ จนทั้ง "ความสูงรวม" และ "ความกว้างช่องที่ยาวที่สุด" ผ่านทั้งคู่
  let spFs = 1.7, cdFs = 2.2;
  for (; spFs >= 1.0; spFs -= 0.05) {
    cdFs = Math.min(2.4, spFs + 0.55);
    const fitsH = cdFs * 1.2 + 0.3 + (1 + rowsNeeded) * spFs * 1.32 <= TAG_RH;
    const fitsW = cellEm * spFs <= cellW * 0.94 && wgEm * spFs <= TAG_RCOL * 0.94;
    if (fitsH && fitsW) break;
  }
  cdFs = Math.min(cdFs, fitFs(p.sku || '', TAG_RCOL, cdFs, 1.4));

  // ใส่ได้กี่แถว (แถวแรกเป็น WG เสมอ) — เกินกว่านี้ต้องยุบ
  const rowCap  = Math.max(1, Math.floor((TAG_RH - cdFs * 1.2 - 0.3) / (spFs * 1.32)));
  const dRowCap = Math.max(0, rowCap - 1);
  const cellCap = twoCol ? dRowCap * 2 : dRowCap;

  // ★ ใส่ไม่หมด → ช่องสุดท้ายที่เห็นเป็น "+N" ไม่ตัดทิ้งเงียบ ๆ
  const cells = dCells.slice(0, cellCap);
  if (dCells.length > cellCap && cellCap > 0) {
    cells[cellCap - 1] = `+${dCells.length - cellCap + 1}`;
  }

  return {
    nmTxt, hasCert, nmFs: nm.fs, nmLines: nm.lines,   // ชื่อ + เครื่องหมายใบเซอร์
    prTxt, prFs: +prFs.toFixed(2),                     // ราคา
    wgTxt, cells, twoCol, cellW,                       // ฝั่งขวา
    spFs: +spFs.toFixed(2), cdFs: +cdFs.toFixed(2),
  };
}

function buildTags(items = []) {
  // copies = จำนวนดวงที่จะพิมพ์ต่อสินค้า 1 ชิ้น
  const list = [];
  for (const p of items) {
    const n = Math.max(1, parseInt(p.copies, 10) || 1);
    for (let i = 0; i < n; i++) list.push(p);
  }

  const tags = list.map((p) => {
    // QR ชี้ไปหน้า "บันทึกการขาย" พร้อมสินค้าชิ้นนี้ — สแกนแล้วขายได้เลย
    const qr = qrSvg(p.qr || tagSaleUrl(p.sku), { margin: 1, cls: 'qr' });

    const L = tagLayout(p);
    const { nmTxt, hasCert, prTxt, wgTxt, twoCol, cellW } = L;
    const nm = { fs: L.nmFs, lines: L.nmLines };
    const prFs = L.prFs, spFs = L.spFs, cdFs = L.cdFs, shownCells = L.cells;

    const head = `<div class="tag">
      <div class="pnl a">
        ${qr}
        <div class="acol">
          <div class="nm" style="font-size:${nm.fs}mm; -webkit-line-clamp:${nm.lines}">${esc(nmTxt)}${hasCert ? `<span class="cs">${CERT_MARK}</span>` : ''}</div>
          <div class="pr" style="font-size:${prFs.toFixed(2)}mm">${prTxt}</div>
        </div>
      </div>
      <div class="pnl b">
        <div class="cd" style="font-size:${cdFs.toFixed(2)}mm">${esc(p.sku || '')}</div>
        <div class="sp" style="font-size:${spFs.toFixed(2)}mm">${esc(wgTxt)}</div>
        ${twoCol
          ? `<div class="dgrid">${shownCells.map(c =>
              `<div class="sp" style="font-size:${spFs.toFixed(2)}mm; width:${cellW.toFixed(2)}mm">${esc(c)}</div>`).join('')}</div>`
          : shownCells.map(c =>
              `<div class="sp" style="font-size:${spFs.toFixed(2)}mm">${esc(c)}</div>`).join('')}
      </div>
    </div>`;
    const tail = '<div class="tail"></div>';
    return `<div class="page">${TAG_HEAD_SIDE === 'left' ? head + tail : tail + head}</div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${TAG_STYLE}</style></head><body>${tags}</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// ใบสั่งทำ (Work Order) — เอกสารส่งช่าง A4
// แยกสไตล์ของตัวเองทั้งชุด ไม่ใช้ STYLE ร่วมกับเอกสารอื่น
// เพราะหน้าตาเป็นคนละแบบ (หนาแน่นแบบใบสั่งผลิตโรงงาน ไม่ใช่เอกสารการเงิน)
// ═══════════════════════════════════════════════════════════════
const WO_METAL_COLOR = {
  white: 'White gold', yellow: 'Yellow gold', light: 'Light gold',
  rose: 'Rose gold', silver: 'Silver',
};
const WO_METAL_TYPE = { '9K': '9K', '14K': '14K', '18K': '18K', silver: 'Silver 925' };

const WO_STYLE = `
  @page { size: A4; margin: 12mm 11mm; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Sarabun',-apple-system,'Helvetica Neue',Arial,sans-serif;
         color:#241016; font-size:12px; line-height:1.5;
         -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* 1 ลูกค้า = 1 แผ่น — ลูกค้าคนถัดไปขึ้นหน้าใหม่เสมอ */
  .doc { width:100%; max-width:800px; margin:0 auto; min-height:269mm; display:flex; flex-direction:column; }
  .doc + .doc { page-break-before:always; break-before:page; }

  .stripe { display:flex; justify-content:space-between; align-items:baseline;
            font-size:10px; color:#8a7078; padding-bottom:9px; border-bottom:1px solid #d6c6ca; }
  .stripe .mid { font-size:14px; font-weight:700; color:#550a19; letter-spacing:.08em; }

  .head { display:flex; gap:26px; padding:14px 0 13px; border-bottom:2px solid #550a19; align-items:flex-start; }
  .kv { flex:1; display:grid; grid-template-columns:78px 1fr; gap:4px 10px; align-content:start; }
  .kv .k { color:#8a7078; font-size:10.5px; }
  .kv .v { font-weight:700; font-size:12px; }
  .kv .v.blank { border-bottom:1px dotted #cdbcc1; min-height:16px; }
  .brand { width:190px; text-align:right; }
  .brandlogo { height:72px; width:auto; display:block; margin-left:auto; }
  .stamp { display:inline-block; margin-top:8px; border:1px solid #d6c6ca; border-radius:3px;
           padding:3px 9px; font-size:9.5px; color:#8a7078; }
  .urgent { display:inline-block; margin-top:5px; border:1px solid #b3261e; color:#b3261e;
            border-radius:3px; padding:2px 8px; font-size:9.5px; font-weight:700; }

  table.jobs { width:100%; border-collapse:collapse; margin-top:16px; }
  table.jobs th { font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:#8a7078;
                  font-weight:600; text-align:left; padding:0 8px 6px; border-bottom:1.5px solid #550a19; }
  table.jobs th.c { text-align:center; }
  table.jobs th.r { text-align:right; }
  table.jobs td { padding:10px 8px; border-bottom:1px solid #ece1e3; vertical-align:top; }
  table.jobs tr { break-inside:avoid; page-break-inside:avoid; }
  td.no   { text-align:center; width:34px; font-size:13px; font-weight:700; color:#550a19; }
  td.pic  { width:150px; }
  td.code { width:112px; font-weight:700; font-size:11.5px; }
  td.amt  { text-align:right; width:96px; font-weight:700; font-size:12.5px; }

  .pics { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
  .pic1 { aspect-ratio:1/1; border-radius:2px; border:1px solid #e6d8db; max-width:100%;
          overflow:hidden; display:flex; align-items:center; justify-content:center;
          font-size:8px; color:#bda8ae; }
  .pic1.empty { border-style:dashed; }
  .pic1 img { width:100%; height:100%; object-fit:cover; display:block; }

  .dl { display:flex; flex-direction:column; gap:1px; }
  .dl .d0 { font-weight:700; font-size:12px; }
  .dl .d1 { font-size:11.5px; color:#4c383d; }
  .dl .d2 { font-size:11px; color:#8a7078; }
  .dl .d3 { font-size:11px; color:#b3261e; }

  .bottom-block { margin-top:auto; padding-top:18px; }
  .sum { display:flex; justify-content:flex-end; }
  .sumtbl { width:330px; }
  .sumrow { display:flex; justify-content:space-between; gap:12px; padding:6px 10px; font-size:12px; }
  .sumrow .lbl { color:#8a7078; }
  .sumrow .val { font-weight:700; }
  .sumrow.total { border-top:1px solid #d6c6ca; }
  .sumrow.paid .lbl { font-size:10.5px; }
  .sumrow.bal { background:#fdf2f4; border:2px solid #550a19; margin-top:4px; padding:9px 10px; }
  .sumrow.bal .lbl { color:#550a19; font-weight:700; font-size:12.5px; }
  .sumrow.bal .val { color:#550a19; font-size:15px; }

  .signs { display:flex; gap:46px; margin-top:30px; }
  .sign { flex:1; text-align:center; }
  .sline { border-top:1px dotted #b3a3a9; margin:0 6px; }
  .slabel { font-size:10px; font-weight:700; color:#5a4f54; margin-top:6px; }
  .ssub { font-size:8.5px; color:#b3a3a9; margin-top:3px; }
  .gap { height:19px; }
  .foot { margin-top:16px; padding-top:9px; border-top:1px solid #ece1e3;
          text-align:center; font-size:8.5px; color:#b3a3a9; }
`;

const woDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};
const DOTS = '......../......../........';
const jsonArr = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  return [];
};
const money = (v) => Math.round(num(v)).toLocaleString('th-TH') + '.—';

// ── บรรทัดรายละเอียดของงาน 1 ชิ้น — ยุบตัวเรือน/เพชร/ไซซ์/สลัก มาไว้ช่องเดียว ──
function woDetail(it = {}) {
  const metal = [WO_METAL_TYPE[it.metal_type] || '', WO_METAL_COLOR[it.metal_color] || ''].filter(Boolean).join(' ');
  const title = [esc(it.job_type || it.name || 'งานสั่งทำ'), metal ? esc(metal) : ''].filter(Boolean).join(' · ');

  const spec = [
    num(it.unit_weight_g) ? `ทอง ${num(it.unit_weight_g).toFixed(2)} กรัม` : '',
    it.ring_size ? `ไซซ์ ${esc(it.ring_size)}` : '',
    num(it.qty) > 1 ? `${esc(it.qty)} ชิ้น` : '',
  ].filter(Boolean).join(' · ');

  const stones = jsonArr(it.stones);
  const stoneLines = stones.map((st) => {
    const head = [esc(st.shape || 'เพชร'),
      `${Math.max(1, num(st.qty) || 1)} เม็ด`,
      num(st.carat) ? `${num(st.carat).toFixed(2)} กะรัต` : ''].filter(Boolean).join(' ');
    const grade = [st.color ? `สี ${esc(st.color)}` : '', esc(st.clarity || ''),
      st.has_cert && st.cert_no ? `IGI ${esc(st.cert_no)}` : ''].filter(Boolean).join(' · ');
    return `<div class="d2">${head}${grade ? ` · ${grade}` : ''}</div>`;
  }).join('');

  const totalCt = stones.reduce((sum, st) => sum + num(st.carat), 0);
  const totalPcs = stones.reduce((sum, st) => sum + Math.max(1, num(st.qty) || 1), 0);
  const sumLine = stones.length > 1
    ? `<div class="d2">รวม ${totalPcs} เม็ด / ${totalCt.toFixed(2)} กะรัต</div>` : '';

  const red = [it.engrave ? `สลัก ${esc(it.engrave)}` : '', esc(it.note || '')].filter(Boolean).join(' · ');

  return `<div class="dl">
    <div class="d0">${title}</div>
    ${spec ? `<div class="d1">${spec}</div>` : ''}
    ${stoneLines}${sumLine}
    ${red ? `<div class="d3">${red}</div>` : ''}
  </div>`;
}

function woPics(it = {}, blank) {
  const photos = jsonArr(it.photos).filter(Boolean).slice(0, 4);
  return `<div class="pics">${[0, 1, 2, 3].map((i) => {
    const src = photos[i];
    return src && !blank
      ? `<div class="pic1"><img src="${esc(src)}" /></div>`
      : `<div class="pic1 empty">รูป ${i + 1}</div>`;
  }).join('')}</div>`;
}

// ── 1 แผ่น = 1 ลูกค้า ──
// orders = ใบสั่งทำของลูกค้าคนนั้น (รวมกันได้หลายใบ) · งานทุกชิ้นลิสต์ต่อกันลงมา
function woPage(orders) {
  const list = Array.isArray(orders) ? orders : [orders];
  const blank = list.length === 1 && list[0].blank;
  const head = list[0] || {};

  const rows = [];
  let n = 0;
  for (const o of list) {
    for (const it of (o.items || [])) {
      n += 1;
      rows.push(`<tr>
        <td class="no">${n}</td>
        <td class="pic">${woPics(it, blank)}</td>
        <td class="code">${esc(it.job_code || '—')}</td>
        <td>${woDetail(it)}</td>
        <td class="amt">${num(it.price) ? money(it.price) : '—'}</td>
      </tr>`);
    }
  }
  if (rows.length === 0) {
    for (let i = 1; i <= 4; i++) {
      rows.push(`<tr>
        <td class="no">${i}</td>
        <td class="pic">${woPics({}, true)}</td>
        <td class="code">&nbsp;</td>
        <td style="height:64px"></td>
        <td class="amt">&nbsp;</td>
      </tr>`);
    }
  }

  const grand = list.reduce((sum, o) => sum + (o.items || []).reduce((t, it) => t + num(it.price), 0), 0);
  const pays = list.flatMap((o) => jsonArr(o.payments)).filter((p) => num(p.amount) > 0);
  const paid = pays.reduce((sum, p) => sum + num(p.amount), 0);
  const paidBreak = pays.length > 1
    ? ` &nbsp;${pays.map((p) => Math.round(num(p.amount)).toLocaleString('th-TH')).join(' + ')}` : '';

  const jobCount = n || 0;

  return `<div class="doc">
    <div class="stripe">
      <div>${esc(COMPANY.name)}</div>
      <div class="mid">ใบสั่งทำ · CUSTOM ORDER</div>
      <div>${esc(COMPANY.addr).slice(0, 40)}</div>
    </div>

    <div class="head">
      <div class="kv">
        <div class="k">ลูกค้า</div><div class="v ${blank || !head.customer_name ? 'blank' : ''}">${blank || !head.customer_name ? '&nbsp;' : esc(head.customer_name)}</div>
        <div class="k">เบอร์โทร</div><div class="v ${blank || !head.customer_phone ? 'blank' : ''}">${blank || !head.customer_phone ? '&nbsp;' : esc(head.customer_phone)}</div>
        <div class="k">วันที่รับงาน</div><div class="v">${blank || !head.ordered_at ? DOTS : woDate(head.ordered_at)}</div>
        <div class="k">กำหนดส่ง</div><div class="v">${blank || !head.due_date ? DOTS : woDate(head.due_date)}</div>
      </div>
      <div class="brand">
        <img class="brandlogo" src="${LOGO_URI}" alt="ANAKYN GEMS" />
        <div class="stamp">${blank ? 'ใบเปล่า — กรอกด้วยมือ' : `${jobCount} งาน`}</div>
        ${!blank && list.some((o) => o.is_urgent) ? '<div class="urgent">งานเร่ง</div>' : ''}
      </div>
    </div>

    <table class="jobs">
      <thead><tr>
        <th class="c">No.</th><th>รูป</th><th>รหัสงาน</th><th>รายละเอียด</th><th class="r">ราคา (บาท)</th>
      </tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>

    <div class="bottom-block">
      <div class="sum"><div class="sumtbl">
        <div class="sumrow total"><div class="lbl">ยอดรวมทั้งหมด</div>
          <div class="val">${blank ? '&nbsp;' : money(grand)}</div></div>
        <div class="sumrow paid"><div class="lbl">ชำระแล้ว${blank ? '' : paidBreak}</div>
          <div class="val">${blank ? '&nbsp;' : money(paid)}</div></div>
        <div class="sumrow bal"><div class="lbl">คงเหลือ</div>
          <div class="val">${blank ? '&nbsp;' : money(grand - paid)}</div></div>
      </div></div>

      <div class="signs">
        <div class="sign"><div class="gap"></div><div class="sline"></div>
          <div class="slabel">${blank || !head.customer_name ? 'ลูกค้า' : esc(head.customer_name)}</div>
          <div class="ssub">วันที่ ${DOTS}</div></div>
        <div class="sign"><div class="gap"></div><div class="sline"></div>
          <div class="slabel">${blank || !head.received_by ? 'ผู้รับออเดอร์' : esc(head.received_by)}</div>
          <div class="ssub">วันที่ ${DOTS}</div></div>
      </div>

      <div class="foot">ใบสั่งทำ · ${esc(COMPANY.name)} · เอกสารฉบับนี้ใช้ประกอบการรับงานและส่งมอบงานเท่านั้น</div>
    </div>
  </div>`;
}

// จับกลุ่มตามชื่อลูกค้า — ชื่อเดียวกันรวมแผ่นเดียว คนละชื่อแยกแผ่น
// ไม่ได้ใส่ชื่อ = กลุ่มของตัวเอง ไม่เอาไปรวมกับใคร
function groupByCustomer(list) {
  const groups = [];
  const index = new Map();
  list.forEach((o, i) => {
    const name = (o.customer_name || '').trim().toLowerCase();
    const key = name || `__ไม่ระบุ__${i}`;
    if (!index.has(key)) { index.set(key, groups.length); groups.push([]); }
    groups[index.get(key)].push(o);
  });
  return groups;
}

function buildWorkOrder(input) {
  const list = Array.isArray(input) ? input : [input || {}];
  const pages = list.length === 1 && list[0].blank
    ? [woPage(list[0])]
    : groupByCustomer(list).map(woPage);
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${WO_STYLE}</style></head><body>${pages.join('')}</body></html>`;
}

export const printWorkOrder = (wo) => printHtml(buildWorkOrder(wo));
export const saveWorkOrder  = (wo) => savePdf(buildWorkOrder(wo));
// ใบเปล่าไว้ปริ้นตุนหน้าร้าน เขียนมือแล้วค่อยมาคีย์เข้าระบบ
export const printBlankWorkOrder = () => printHtml(buildWorkOrder({ blank: true }));

// ── ข้อมูลป้าย: ใช้ร่วมกับ "ตัวอย่างป้ายสินค้า" บนหน้าจอ (TagPreview.jsx) ──
//    ตัวอย่างบนจอกับป้ายที่พิมพ์จริงจึงอ่านค่าจากที่เดียวกันเสมอ
export const TAG_SPEC = {
  w: TAG_W, h: TAG_BODY_H, foldX: TAG_FOLD_X,
  padX: TAG_PAD_X, qr: TAG_QR, col: TAG_COL, rcol: TAG_RCOL,
};

export function tagFields(p = {}) {
  // ขนาดตัวอักษรและช่องที่แสดงได้ มาจาก tagLayout() ตัวเดียวกับที่หน้าพิมพ์ใช้
  // → ตัวอย่างบนจอจึงย่อฟอนต์ตามและไม่มีทางล้นขอบ
  const L = tagLayout(p);
  return {
    name:    L.nmTxt,
    sku:     p.sku || '',
    price:   L.prTxt,
    hasCert: L.hasCert,        // true = เติมวงกลมทึบท้ายชื่อ (ไม่ใช่บรรทัดแยกแล้ว)
    wg:      L.wgTxt,          // 'WG: 9K 2.95g'
    dCells:  L.cells,          // ช่องเพชรที่ใส่คำนำหน้า + ยุบ "+N" เรียบร้อยแล้ว
    twoCol:  L.twoCol,         // true = ให้วาง 2 คอลัมน์
    // ★ ขนาดทั้งหมดเป็นมิลลิเมตร — คูณ MM แล้วใช้ได้เลย ห้ามตั้งค่าเอง
    nmFs: L.nmFs, nmLines: L.nmLines, prFs: L.prFs, spFs: L.spFs, cdFs: L.cdFs,
    specs:   [L.wgTxt, ...L.cells],   // แบบแบนเรียงต่อกัน (ของเดิม)
    qrText:  p.qr || tagSaleUrl(p.sku || ''),
  };
}

// ══════════ exports: print / save ══════════
export const printTags = (items) => printHtml(buildTags(items));
export const saveTags  = (items) => savePdf(buildTags(items));
export const printStock = (items) => printHtml(buildStock(items));
export const printInvoice = (o) => printHtml(buildInvoice(o));
export const saveInvoice = (o) => savePdf(buildInvoice(o));
export const printQuotation = (o) => printHtml(buildQuotation(o));
export const saveQuotation = (o) => savePdf(buildQuotation(o));
export const printPO = (o) => printHtml(buildPO(o));
export const savePO = (o) => savePdf(buildPO(o));
export const printServiceOrder = (o) => printHtml(buildServiceOrder(o));
export const saveServiceOrder = (o) => savePdf(buildServiceOrder(o));
export const printReceipt = (o) => printHtml(buildReceipt(o));
export const saveReceipt = (o) => savePdf(buildReceipt(o));
export const printSummary = (d, label) => printHtml(buildSummary(d, label));
