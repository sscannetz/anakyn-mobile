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
import { tagSaleUrl, splitSku } from './scan';

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
//   ซ้าย  = หน้าหลัก : QR + ANAKYN#xxxx + ราคา
//   ขวา   = หน้ารายละเอียด : ชื่อสินค้า / โลหะ+น้ำหนัก / เพชร / ใบเซอร์
//   ใช้กับเครื่องพิมพ์ฉลาก เช่น TSC TTP-345 (300 dpi) — ตั้ง paper size = 50×15 มม.
//   1 ป้าย = 1 หน้ากระดาษ (page-break) · สีดำล้วนล้วนเพื่อความคมบนหัวพิมพ์ความร้อน
// ═══════════════════════════════════════════════════════════════
const TAG_W = 50, TAG_H = 15;     // ขนาดป้ายทั้งใบ (มม.)
const TAG_HALF = TAG_W / 2;       // เส้นพับอยู่กึ่งกลาง
const TAG_FOLD_LINE = true;       // แสดงเส้นประช่วยพับ (ตั้ง false ถ้าใช้ป้ายที่ปรุรอยพับมาแล้ว)

const TAG_STYLE = `
  @page { size: ${TAG_W}mm ${TAG_H}mm; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${TAG_W}mm; }
  body { font-family:'Sarabun', -apple-system, 'Helvetica Neue', Arial, sans-serif;
         color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .tag  { width:${TAG_W}mm; height:${TAG_H}mm; display:flex; overflow:hidden;
          page-break-after:always; break-after:page; }
  .tag:last-child { page-break-after:auto; break-after:auto; }
  .pnl  { width:${TAG_HALF}mm; height:${TAG_H}mm; padding:1mm 1.1mm; overflow:hidden; }
  ${TAG_FOLD_LINE ? `.pnl.a { border-right:0.1mm dotted #000; }` : ''}

  /* ── หน้าหลัก: QR + รหัส + ราคา ──
     QR 11.2 มม. → v3 (29×29) ได้โมดูลละ ~0.36 มม. สแกนติดง่ายบนป้ายเล็ก */
  .pnl.a { display:flex; align-items:center; gap:0.8mm; }
  .qr    { width:11.2mm; height:11.2mm; flex:0 0 11.2mm; display:block; }
  .acol  { flex:1; min-width:0; }
  .brand { font-weight:600; line-height:1.1; letter-spacing:0.03mm;
           white-space:nowrap; overflow:hidden; }
  .sku   { font-weight:700; line-height:1.15; letter-spacing:-0.01mm;
           white-space:nowrap; overflow:hidden; }
  .pr    { font-weight:800; line-height:1.2; margin-top:0.6mm;
           white-space:nowrap; overflow:hidden; }

  /* ── หน้ารายละเอียด ── */
  .pnl.b { display:flex; flex-direction:column; justify-content:center; }
  .nm    { font-size:2.1mm; font-weight:700; line-height:1.2; margin-bottom:0.6mm;
           display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
           overflow:hidden; }
  .dt    { font-size:1.85mm; line-height:1.35;
           white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  @media print { .tag { page-break-inside:avoid; break-inside:avoid; } }
`;

// ── คำนวณ font-size ให้ข้อความพอดีช่องเป๊ะ (ไม่โดนตัดท้าย) ──
// ประมาณความกว้างตัวอักษรเป็นหน่วย em ของฟอนต์ Sarabun
function textEm(s) {
  let em = 0;
  for (const ch of String(s)) {
    if (ch >= '0' && ch <= '9') em += 0.55;          // ตัวเลข
    else if (ch === ',' || ch === '.' || ch === ' ') em += 0.28;
    else if (ch === '#' || ch === '฿') em += 0.62;
    else if (ch >= 'A' && ch <= 'Z') em += 0.64;     // ตัวพิมพ์ใหญ่
    else em += 0.56;                                  // ที่เหลือ (รวมไทย)
  }
  return em || 1;
}
// คืน font-size (มม.) ที่ทำให้ข้อความกว้างไม่เกิน maxW
const fitFs = (s, maxW, maxFs, minFs) =>
  Math.max(minFs, Math.min(maxFs, maxW / textEm(s)));

// "18K · 3.25 g"
function tagMetal(p) {
  const w = p.metal_weight_g ?? p.weight ?? p.metal_weight_adj_g;
  const g = num(w) ? `${num(w).toFixed(2)} g` : '';
  return [p.metal_type || '', g].filter(Boolean).join(' · ');
}

// "เพชร 5 เม็ด · 0.85 ct"
function tagDiamond(p) {
  let ds = p.diamonds;
  if (typeof ds === 'string') { try { ds = JSON.parse(ds); } catch (_) { ds = []; } }
  if (!Array.isArray(ds) || !ds.length) return '';
  let qty = 0, ct = 0;
  for (const d of ds) {
    const q = num(d.qty) || 1;
    qty += q;
    ct += num(d.weight) * q;
  }
  if (!qty) return '';
  return `เพชร ${qty} เม็ด` + (ct ? ` · ${ct.toFixed(2)} ct` : '');
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

    // ── ช่องข้าง QR กว้างแค่ ~10.6 มม. ──
    // แยก SKU เป็น 2 บรรทัด  ANAKYN / #0207  แทนที่จะบีบให้อยู่บรรทัดเดียวจนอ่านไม่ออก
    // ทุกบรรทัดคำนวณ font-size จากความกว้างจริงของข้อความ → เห็นครบทุกตัว ไม่โดนตัด
    const { brand, code } = splitSku(p.sku);
    const prTxt  = baht(p.sale_price);
    const COL_W  = 10.6;                              // มม.
    const brandFs = brand ? fitFs(brand, COL_W, 1.9, 1.2) : 0;
    const codeFs  = fitFs(code,  COL_W, 2.9, 1.5);
    const prFs    = fitFs(prTxt, COL_W, 2.9, 1.6);
    // หน้ารายละเอียด — โลหะ+น้ำหนัก และ เพชร (ข้ามบรรทัดที่ไม่มีข้อมูล)
    const details = [tagMetal(p), tagDiamond(p)]
      .filter(Boolean)
      .map(d => `<div class="dt">${esc(d)}</div>`).join('');

    return `<div class="tag">
      <div class="pnl a">
        ${qr}
        <div class="acol">
          ${brand ? `<div class="brand" style="font-size:${brandFs}mm">${esc(brand)}</div>` : ''}
          <div class="sku" style="font-size:${codeFs}mm">${esc(code)}</div>
          <div class="pr" style="font-size:${prFs}mm">${prTxt}</div>
        </div>
      </div>
      <div class="pnl b">
        <div class="nm">${esc(p.name || '-')}</div>
        ${details}
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${TAG_STYLE}</style></head><body>${tags}</body></html>`;
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
