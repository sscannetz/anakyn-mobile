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
  .doc { width:100%; max-width:780px; margin:0 auto; }

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
function renderDoc({ badge, docNo, meta = [], parties, sections = '', signatures }) {
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
      ${signHtml}
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
    )}</div>
    ${totals(
      [['รวมค่าสินค้า', baht(inv.subtotal ?? inv.grand_total)]],
      'ยอดรวมทั้งสิ้น', baht(inv.grand_total)
    )}`;
  return renderDoc({
    badge: 'ใบกำกับภาษี', docNo: inv.invoice_no,
    meta: [['วันที่', dateTH(inv.issued_at)], ['อ้างอิงการขาย', inv.sale_no || '—']],
    parties: { seller: SELLER, buyer: { label: 'ลูกค้า / ผู้ซื้อ', name: inv.customer_name, sub: inv.customer_phone } },
    sections,
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
    )}</div>
    ${totals(
      [['รวมค่าสินค้า', baht(qt.subtotal ?? qt.grand_total)]],
      'ยอดรวมทั้งสิ้น', baht(qt.grand_total)
    )}
    ${qt.notes ? `<div class="sec"><div class="sl">หมายเหตุ</div><div class="ps">${esc(qt.notes)}</div></div>` : ''}`;
  return renderDoc({
    badge: 'ใบเสนอราคา', docNo: qt.quote_no || qt.quotation_no,
    meta: [['วันที่', dateTH(qt.created_at || qt.issued_at)], ['ยืนราคาถึง', qt.valid_until ? dateTH(qt.valid_until) : '—']],
    parties: { seller: { ...SELLER, label: 'ผู้เสนอราคา' }, buyer: { label: 'ลูกค้า', name: qt.customer_name, sub: qt.phone } },
    sections,
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
    )}</div>
    ${totals(
      [['รวมค่าสินค้า', baht(po.subtotal ?? po.total)]],
      'ยอดรวมทั้งสิ้น', baht(po.total)
    )}
    ${po.notes ? `<div class="sec"><div class="sl">หมายเหตุ</div><div class="ps">${esc(po.notes)}</div></div>` : ''}`;
  return renderDoc({
    badge: 'ใบสั่งซื้อ', docNo: po.po_no,
    meta: [['วันที่', dateTH(po.created_at)], ['ต้องการภายใน', po.needed_by ? dateTH(po.needed_by) : '—']],
    parties: { seller: { label: 'ผู้ขาย (ซัพพลายเออร์)', name: po.supplier_name, sub: po.phone }, buyer: { ...SELLER, label: 'ผู้สั่งซื้อ' } },
    sections,
    signatures: [{ label: 'ผู้สั่งซื้อ' }, { label: 'ผู้อนุมัติ' }],
  });
}

function buildServiceOrder(so = {}) {
  const rows = (so.services || []).map((sv, i) =>
    `<tr><td class="c">${i + 1}</td><td class="iname">${esc(sv.name || 'บริการ')}</td>
      <td class="r ${sv.is_warranty ? 'muted' : 'price'}">${sv.is_warranty ? 'ประกัน (ฟรี)' : baht(sv.price)}</td></tr>`).join('');
  const totalRows = [['ค่าซ่อม / บริการ', baht(so.base_cost ?? so.total_cost ?? so.estimated_cost)]];
  const sections = `<div class="sec"><div class="sl">รายละเอียดงานซ่อม</div>
      <div class="fields">
        <div class="field"><div class="fl">สินค้าที่ซ่อม</div><div class="fv">${esc(so.product_name || '—')}</div></div>
        ${so.issue_description ? `<div class="field"><div class="fl">อาการ / ปัญหา</div><div class="fv">${esc(so.issue_description)}</div></div>` : ''}
      </div>
    </div>
    <div class="sec"><div class="sl">รายการซ่อม / บริการ</div>
    ${table(
      [{ label: '#', align: 'c' }, { label: 'รายการ' }, { label: 'ค่าบริการ', align: 'r' }],
      rows
    )}</div>
    ${totals(totalRows, 'ยอดรวมทั้งสิ้น', baht(so.grand_total ?? so.total_cost ?? so.estimated_cost))}`;
  return renderDoc({
    badge: 'ใบสั่งซ่อม', docNo: so.service_no,
    meta: [['วันที่รับ', dateTH(so.received_at || so.created_at)], ['นัดรับ', so.pickup_date ? dateTH(so.pickup_date) : '—']],
    parties: { seller: SELLER, buyer: { label: 'ลูกค้า', name: so.customer_name, sub: so.customer_phone } },
    sections,
    signatures: [{ label: 'ผู้รับงานซ่อม' }, { label: 'ลูกค้า' }],
  });
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
    )}</div>
    ${totals(
      [['ชำระโดย', PAY_LABELS[rc.payment_method] || rc.payment_method || '—']],
      'จำนวนเงินที่รับ', baht(amount)
    )}
    ${rc.note ? `<div class="sec"><div class="sl">หมายเหตุ</div><div class="ps">${esc(rc.note)}</div></div>` : ''}`;
  return renderDoc({
    badge: 'ใบเสร็จรับเงิน', docNo: rc.receipt_no,
    meta: [['วันที่', dateTH(rc.issued_at)], ['อ้างอิงการขาย', rc.sale_no || '—']],
    parties: { seller: { ...SELLER, label: 'ผู้รับเงิน' }, buyer: { label: 'ผู้ชำระเงิน', name: rc.customer_name, sub: rc.phone } },
    sections,
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
  /* "มีใบเซอร์" — อยู่กลางคอลัมน์ ระหว่างชื่อสินค้ากับราคา (space-between จัดให้เอง) */
  .ct    { font-weight:700; line-height:1.25; white-space:nowrap; overflow:hidden; }

  /* ── หน้าสเปก: ANAKYN#xxxx / WG / D: ... (ขนาดฟอนต์คำนวณต่อใบใน buildTags) ── */
  .pnl.b { display:flex; flex-direction:column; justify-content:flex-start; }
  .cd    { font-weight:700; line-height:1.2; margin-bottom:0.3mm;
           white-space:nowrap; overflow:hidden; }
  .sp    { line-height:1.32; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
           font-variant-numeric:tabular-nums; }

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

// ["D: 1/1.00ct (RD)", "D: 10/0.20ct (RD)", ...] — 1 บรรทัดต่อเพชร 1 กลุ่ม
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
      return `D: ${q}/${ct.toFixed(2)}ct${sc ? ` (${sc})` : ''}`;
    });
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

    // ── ฝั่งซ้าย: ชื่อสินค้า (ชิดบน) + ราคา (ชิดล่าง) ในคอลัมน์สูงเท่า QR ──
    const prTxt = baht(p.sale_price);
    const prFs  = fitFs(prTxt, TAG_COL, 2.3, 1.35);

    // "มีใบเซอร์" แทรกกลางคอลัมน์ — กินความสูงไปจากโควตาของชื่อสินค้า
    const hasCert = tagHasCert(p);
    const ctTxt   = 'มีใบเซอร์';
    const ctFs    = hasCert ? fitFs(ctTxt, TAG_COL, 1.6, 1.05) : 0;
    const ctH     = hasCert ? ctFs * 1.25 + 0.3 : 0;

    // ยาวได้ถึง 4 บรรทัด — เกินกว่านั้นค่อยย่อฟอนต์ลง (ไม่ตัดท้ายด้วย …)
    const nmH   = Math.max(1.6, TAG_QR - (prFs * 1.2 + 0.4) - ctH);
    const nm    = fitWrapped(p.name || '-', TAG_COL, nmH, 1.75, 1.05, 4);

    // ── ฝั่งขวา: ANAKYN#xxxx / WG: ... / D: ... ──
    // ย่อฟอนต์ลงเรื่อย ๆ จนทุกบรรทัดใส่ในความสูงที่มี แล้วค่อยหยุด
    const specs = [tagWgLine(p), ...tagDiamondLines(p)];
    let spFs = 1.7, cdFs = 2.2;
    for (; spFs >= 1.0; spFs -= 0.05) {
      cdFs = Math.min(2.4, spFs + 0.55);
      if (cdFs * 1.2 + 0.3 + specs.length * spFs * 1.32 <= TAG_RH) break;
    }
    cdFs = Math.min(cdFs, fitFs(p.sku || '', TAG_RCOL, cdFs, 1.4));
    // ถ้าเพชรเยอะจนใส่ไม่หมดจริง ๆ ตัดเฉพาะเท่าที่พอดี (กันล้นกรอบ)
    const maxLines = Math.max(1, Math.floor((TAG_RH - cdFs * 1.2 - 0.3) / (spFs * 1.32)));
    const shown = specs.slice(0, maxLines);

    const head = `<div class="tag">
      <div class="pnl a">
        ${qr}
        <div class="acol">
          <div class="nm" style="font-size:${nm.fs}mm; -webkit-line-clamp:${nm.lines}">${esc(p.name || '-')}</div>
          ${hasCert ? `<div class="ct" style="font-size:${ctFs.toFixed(2)}mm">${ctTxt}</div>` : ''}
          <div class="pr" style="font-size:${prFs.toFixed(2)}mm">${prTxt}</div>
        </div>
      </div>
      <div class="pnl b">
        <div class="cd" style="font-size:${cdFs.toFixed(2)}mm">${esc(p.sku || '')}</div>
        ${shown.map(s => `<div class="sp" style="font-size:${spFs.toFixed(2)}mm">${esc(s)}</div>`).join('')}
      </div>
    </div>`;
    const tail = '<div class="tail"></div>';
    return `<div class="page">${TAG_HEAD_SIDE === 'left' ? head + tail : tail + head}</div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${TAG_STYLE}</style></head><body>${tags}</body></html>`;
}

// ── ข้อมูลป้าย: ใช้ร่วมกับ "ตัวอย่างป้ายสินค้า" บนหน้าจอ (TagPreview.jsx) ──
//    ตัวอย่างบนจอกับป้ายที่พิมพ์จริงจึงอ่านค่าจากที่เดียวกันเสมอ
export const TAG_SPEC = {
  w: TAG_W, h: TAG_BODY_H, foldX: TAG_FOLD_X,
  padX: TAG_PAD_X, qr: TAG_QR, col: TAG_COL, rcol: TAG_RCOL,
};

export function tagFields(p = {}) {
  return {
    name:    p.name || '-',
    sku:     p.sku || '',
    price:   baht(p.sale_price),
    hasCert: tagHasCert(p),
    specs:   [tagWgLine(p), ...tagDiamondLines(p)],
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
