// ═══════════════════════════════════════════════════════════════
// print.js — สร้างเอกสาร HTML สไตล์ทางการ (สีเลือดหมู) แล้วสั่งปริ้น / บันทึก PDF
// ใช้ expo-print: เว็บเปิด print dialog ของเบราว์เซอร์, มือถือเปิด print sheet
// (มีตัวเลือก "Save as PDF" / "บันทึกเป็น PDF")
// ═══════════════════════════════════════════════════════════════
import * as Print from 'expo-print';

// ── helper ──
const num = (n) => { const x = Number(n); return Number.isFinite(x) ? x : 0; };
const baht = (n) => '฿' + Math.round(num(n)).toLocaleString('th-TH');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateTH = (v) => { const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('th-TH'); };

const STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', 'Sarabun', Arial, sans-serif; color:#2c1015; background:#f1e9eb; padding:20px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .doc { max-width:660px; margin:0 auto; background:#fff; border:0.5px solid #c8a0b0; border-radius:14px; overflow:hidden; box-shadow:0 8px 30px rgba(85,10,25,0.10); }
  .hd { background:#550a19; padding:20px 22px 0; color:#fff5f7; }
  .hd-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
  .brand { font-size:22px; font-weight:800; letter-spacing:4px; color:#fff5f7; }
  .brand-sub { font-size:9px; letter-spacing:6px; color:#d4a0ac; margin-top:2px; }
  .badge { display:inline-block; background:rgba(255,255,255,0.12); border:0.5px solid rgba(255,255,255,0.25); border-radius:20px; padding:4px 13px; font-size:10px; letter-spacing:2px; color:#f0d0d8; margin-bottom:5px; }
  .docno { font-size:14px; font-weight:700; color:#fff5f7; }
  .meta { display:flex; gap:8px; background:rgba(255,255,255,0.08); border-radius:8px 8px 0 0; padding:11px 14px; }
  .meta > div { flex:1; }
  .meta .ml { font-size:9px; letter-spacing:1px; color:#d4a0ac; }
  .meta .mv { font-size:11px; font-weight:600; color:#f5e8eb; margin-top:2px; }
  .parties { display:flex; border-bottom:0.5px solid #f0e4e8; }
  .party { flex:1; padding:12px 16px; }
  .party + .party { border-left:0.5px solid #f0e4e8; }
  .pl { font-size:9px; letter-spacing:1.5px; color:#a07080; margin-bottom:5px; text-transform:uppercase; }
  .pn { font-size:13px; font-weight:700; color:#2c1015; }
  .ps { font-size:10px; color:#a07080; margin-top:2px; line-height:1.5; }
  .sec { padding:14px 16px; border-bottom:0.5px solid #f0e4e8; }
  .sl { font-size:9px; letter-spacing:1.5px; color:#a07080; margin-bottom:9px; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; font-size:9px; letter-spacing:1px; color:#a07080; border-bottom:0.5px dashed #e8d5d9; padding:0 4px 6px; text-transform:uppercase; }
  td { padding:8px 4px; border-bottom:0.5px solid #f9f4f5; font-size:12px; vertical-align:top; }
  .r { text-align:right; } .c { text-align:center; }
  .iname { font-weight:600; color:#2c1015; }
  .isub { font-size:10px; color:#a07080; margin-top:1px; }
  .price { font-weight:700; color:#550a19; }
  .tot { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; color:#806070; }
  .tot b { color:#2c1015; font-weight:600; }
  .grand { background:#550a19; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; }
  .grand .gl { font-size:13px; font-weight:500; color:#f0d0d8; }
  .grand .gv { font-size:21px; font-weight:800; color:#fff5f7; }
  .foot { padding:12px 16px; text-align:center; font-size:10px; color:#a07080; line-height:1.6; }
  @media print { body { background:#fff; padding:0; } .doc { box-shadow:none; border:none; max-width:100%; } }
`;

function renderDoc({ badge, docNo, meta = [], parties, sections = '' }) {
  const metaHtml = meta.length
    ? `<div class="meta">${meta.map(([l, v]) => `<div><div class="ml">${esc(l)}</div><div class="mv">${esc(v)}</div></div>`).join('')}</div>`
    : '';
  const partiesHtml = parties
    ? `<div class="parties">${[parties.seller, parties.buyer].filter(Boolean).map(p =>
        `<div class="party"><div class="pl">${esc(p.label)}</div><div class="pn">${esc(p.name || 'ไม่ระบุ')}</div>${p.sub ? `<div class="ps">${esc(p.sub)}</div>` : ''}</div>`
      ).join('')}</div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" /><style>${STYLE}</style></head>
    <body><div class="doc">
      <div class="hd">
        <div class="hd-top">
          <div><div class="brand">ANAKYN</div><div class="brand-sub">GEMS</div></div>
          <div style="text-align:right;"><div class="badge">${esc(badge)}</div><div class="docno">${esc(docNo || '—')}</div></div>
        </div>
        ${metaHtml}
      </div>
      ${partiesHtml}
      ${sections}
      <div class="foot">ขอบคุณที่ใช้บริการ · Anakyn Gems Co., Ltd. · พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}</div>
    </div></body></html>`;
}

async function go(html) {
  try { await Print.printAsync({ html }); }
  catch (e) { console.log('print cancelled', e?.message); }
}

const SELLER = { label: 'ผู้ขาย', name: 'Anakyn Gems Co., Ltd.', sub: '123 ถ.สีลม กรุงเทพฯ 10500' };

// ── 1) สต๊อกสินค้า ──
export function printStock(items = []) {
  const rows = items.map((p, i) => {
    const qty = num(p.stock_qty), price = num(p.sale_price);
    return `<tr><td class="c">${i + 1}</td><td><span class="iname">${esc(p.name)}</span><div class="isub">${esc(p.sku)}</div></td>
      <td class="c">${qty}</td><td class="r">${baht(price)}</td><td class="r price">${baht(qty * price)}</td></tr>`;
  }).join('');
  const totalQty = items.reduce((s, p) => s + num(p.stock_qty), 0);
  const totalVal = items.reduce((s, p) => s + num(p.stock_qty) * num(p.sale_price), 0);
  const sections = `<div class="sec"><div class="sl">รายการสินค้าคงคลัง (${items.length} รายการ)</div>
    <table><thead><tr><th class="c">#</th><th>สินค้า</th><th class="c">จำนวน</th><th class="r">ราคา/ชิ้น</th><th class="r">มูลค่ารวม</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="c">ไม่มีสินค้า</td></tr>'}</tbody></table></div>
    <div class="grand"><span class="gl">รวม ${totalQty} ชิ้น</span><span class="gv">${baht(totalVal)}</span></div>`;
  return go(renderDoc({ badge: 'สต๊อกสินค้า', docNo: new Date().toLocaleDateString('th-TH'), sections }));
}

// ── 2) ใบกำกับภาษี ──
export function printInvoice(inv = {}) {
  const rows = (inv.items || []).map((it) =>
    `<tr><td><span class="iname">${esc(it.product_name || it.name || 'รายการ')}</span>${it.sku ? `<div class="isub">${esc(it.sku)}</div>` : ''}</td>
      <td class="r price">${baht(it.unit_price ?? it.line_total)}</td></tr>`).join('');
  const sections = `<div class="sec"><div class="sl">รายการสินค้า</div>
    <table><thead><tr><th>รายการ</th><th class="r">ราคา</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="2" class="c">—</td></tr>'}</tbody></table></div>
    <div class="sec"><div class="tot"><span>มูลค่าก่อน VAT</span><b>${baht(inv.subtotal ?? inv.grand_total)}</b></div>
    <div class="tot"><span>VAT 7%</span><b>${baht(inv.vat_amount)}</b></div></div>
    <div class="grand"><span class="gl">ยอดรวมทั้งสิ้น</span><span class="gv">${baht(inv.grand_total)}</span></div>`;
  return go(renderDoc({
    badge: 'ใบกำกับภาษี', docNo: inv.invoice_no,
    meta: [['วันที่', dateTH(inv.issued_at)], ['อ้างอิง', inv.sale_no || '—'], ['VAT', inv.vat_applied === false ? 'ไม่มี' : '7%']],
    parties: { seller: SELLER, buyer: { label: 'ลูกค้า', name: inv.customer_name, sub: inv.customer_phone } },
    sections,
  }));
}

// ── 3) ใบเสนอราคา ──
export function printQuotation(qt = {}) {
  const rows = (qt.items || []).map((it, i) =>
    `<tr><td class="c">${i + 1}</td><td class="iname">${esc(it.name || it.product_name || `รายการที่ ${i + 1}`)}</td>
      <td class="c">${num(it.qty) || 1}</td><td class="r">${baht(it.unit_price ?? it.price)}</td>
      <td class="r price">${baht((num(it.qty) || 1) * num(it.unit_price ?? it.price))}</td></tr>`).join('');
  const sections = `<div class="sec"><div class="sl">รายการสินค้า</div>
    <table><thead><tr><th class="c">#</th><th>รายการ</th><th class="c">จำนวน</th><th class="r">ราคา/หน่วย</th><th class="r">รวม</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="c">—</td></tr>'}</tbody></table></div>
    <div class="sec"><div class="tot"><span>มูลค่าก่อน VAT</span><b>${baht(qt.subtotal ?? qt.grand_total)}</b></div>
    <div class="tot"><span>VAT 7%</span><b>${baht(qt.vat_amount)}</b></div></div>
    <div class="grand"><span class="gl">ยอดรวมทั้งสิ้น</span><span class="gv">${baht(qt.grand_total)}</span></div>`;
  return go(renderDoc({
    badge: 'ใบเสนอราคา', docNo: qt.quote_no || qt.quotation_no,
    meta: [['วันที่', dateTH(qt.created_at || qt.issued_at)], ['ยืนราคาถึง', qt.valid_until ? dateTH(qt.valid_until) : '—'], ['VAT', qt.vat_applied === false ? 'ไม่มี' : '7%']],
    parties: { seller: { ...SELLER, label: 'ผู้เสนอราคา' }, buyer: { label: 'ลูกค้า', name: qt.customer_name, sub: qt.phone } },
    sections,
  }));
}

// ── 4) ใบสั่งซื้อ ──
export function printPO(po = {}) {
  const rows = (po.items || []).map((it, i) =>
    `<tr><td class="c">${i + 1}</td><td class="iname">${esc(it.item_name || it.name)}</td>
      <td class="c">${num(it.qty)}${it.unit ? ' ' + esc(it.unit) : ''}</td>
      <td class="r">${baht(it.unit_price ?? it.price)}</td>
      <td class="r price">${baht(it.line_total ?? (num(it.qty) * num(it.unit_price ?? it.price)))}</td></tr>`).join('');
  const sections = `<div class="sec"><div class="sl">รายการสั่งซื้อ</div>
    <table><thead><tr><th class="c">#</th><th>รายการ</th><th class="c">จำนวน</th><th class="r">ราคา/หน่วย</th><th class="r">รวม</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="c">—</td></tr>'}</tbody></table></div>
    <div class="grand"><span class="gl">ยอดรวมทั้งสิ้น</span><span class="gv">${baht(po.total)}</span></div>`;
  return go(renderDoc({
    badge: 'ใบสั่งซื้อ', docNo: po.po_no,
    meta: [['วันที่', dateTH(po.created_at)], ['ต้องการภายใน', po.needed_by ? dateTH(po.needed_by) : '—'], ['สถานะ', po.status || '—']],
    parties: { seller: { label: 'ผู้ขาย (ซัพพลายเออร์)', name: po.supplier_name, sub: po.phone }, buyer: { ...SELLER, label: 'ผู้สั่งซื้อ' } },
    sections,
  }));
}

// ── 5) ใบสั่งซ่อม ──
export function printServiceOrder(so = {}) {
  const rows = (so.services || []).map((sv, i) =>
    `<tr><td class="c">${i + 1}</td><td class="iname">${esc(sv.name || 'บริการ')}</td>
      <td class="r ${sv.is_warranty ? '' : 'price'}">${sv.is_warranty ? 'ประกัน (ฟรี)' : baht(sv.price)}</td></tr>`).join('');
  const sections = `<div class="sec">
      <div class="tot"><span>สินค้าที่ซ่อม</span><b>${esc(so.product_name || '—')}</b></div>
      ${so.issue_description ? `<div class="tot"><span>อาการ / ปัญหา</span><b>${esc(so.issue_description)}</b></div>` : ''}
    </div>
    <div class="sec"><div class="sl">รายการซ่อม / บริการ</div>
    <table><thead><tr><th class="c">#</th><th>รายการ</th><th class="r">ค่าบริการ</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3" class="c">—</td></tr>'}</tbody></table></div>
    <div class="grand"><span class="gl">ค่าซ่อมรวม</span><span class="gv">${baht(so.total_cost ?? so.estimated_cost)}</span></div>`;
  return go(renderDoc({
    badge: 'ใบสั่งซ่อม', docNo: so.service_no,
    meta: [['วันที่รับ', dateTH(so.received_at || so.created_at)], ['นัดรับ', so.pickup_date ? dateTH(so.pickup_date) : '—'], ['สถานะ', so.status || '—']],
    parties: { seller: SELLER, buyer: { label: 'ลูกค้า', name: so.customer_name, sub: so.customer_phone } },
    sections,
  }));
}

// ── 6) สรุปรายงาน ──
export function printSummary(d = {}, periodLabel = '') {
  const kpi = [
    ['ยอดขาย', baht(d.total_sales)], ['จำนวนออเดอร์', `${num(d.order_count)} รายการ`],
    ['กำไรโดยประมาณ', baht(d.estimated_profit)], ['VAT ที่เก็บ', baht(d.vat_collected)],
  ].map(([l, v]) => `<div class="tot"><span>${l}</span><b>${v}</b></div>`).join('');
  const top = (d.top_items || []).map((it, i) =>
    `<tr><td class="c">${i + 1}</td><td class="iname">${esc(it.name)}</td><td class="isub">${esc(it.sku)}</td>
      <td class="c">${num(it.qty)}</td><td class="r price">${baht(it.amount)}</td></tr>`).join('');
  const pending = [
    ['PO ค้างอยู่', num(d.pending_po)], ['งานซ่อมค้าง', num(d.pending_service)], ['ใบเสนอราคาค้าง', num(d.pending_quotation)],
  ].map(([l, v]) => `<div class="tot"><span>${l}</span><b>${v}</b></div>`).join('');
  const sections = `<div class="sec"><div class="sl">ตัวชี้วัดหลัก</div>${kpi}</div>
    <div class="sec"><div class="sl">สินค้าขายดี</div>
    <table><thead><tr><th class="c">#</th><th>สินค้า</th><th>SKU</th><th class="c">ขาย</th><th class="r">ยอด</th></tr></thead>
    <tbody>${top || '<tr><td colspan="5" class="c">—</td></tr>'}</tbody></table></div>
    <div class="sec"><div class="sl">รายการค้างอยู่</div>${pending}</div>`;
  return go(renderDoc({ badge: 'สรุปรายงาน', docNo: periodLabel || new Date().toLocaleDateString('th-TH'), sections }));
}
