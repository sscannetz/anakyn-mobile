// ══════════════════════════════════════════════════════
// SaleScreen.jsx — React Native version of AnakynSalePage
// ══════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, FlatList, Platform,
} from 'react-native';
import ShellModal from '../components/ShellModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import { useWide } from '../components/DataPanel';
import PromptPayModal from '../components/PromptPayModal';
import QrScanner from '../components/QrScanner';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { normSku, parseScanned } from '../scan';

const T = {
  th: {
    pageTitle: 'บันทึกการขาย',
    addItem: 'เพิ่มสินค้า', searchItem: 'ค้นหาชื่อ / รหัส SKU...',
    fromStock: 'เลือกจากสต๊อก', noStock: 'ไม่มีสินค้าในสต๊อก',
    addMore: 'เพิ่มสินค้าชิ้นถัดไป', noItems: 'ยังไม่ได้เลือกสินค้า',
    salePrice: 'ราคาขาย', hasCert: 'มีใบเซอร์',
    customer: 'ลูกค้า', searchMember: 'ค้นหาชื่อ / เบอร์โทร...',
    noCustomer: 'ไม่ระบุลูกค้า',
    vipDisc: 'ส่วนลด VIP', extraDisc: 'ส่วนลดพิเศษ',
    priceItem: 'ราคาสินค้า', priceVip: 'ส่วนลด VIP', priceExtra: 'ส่วนลดพิเศษ',
    vatLabel: 'VAT 7%', vatOn: 'มี', vatOff: 'ไม่มี', grandTotal: 'ยอดสุทธิ',
    payment: 'ช่องทางชำระเงิน', payHint: 'เลือกได้หลายช่องทาง (แบ่งจ่าย)',
    splitTitle: 'แบ่งยอดชำระ', remaining: 'ยอดคงเหลือ', paid: 'ครบแล้ว',
    confirmSale: (v) => `ยืนยันการขาย ฿${v}`,
    saving: 'กำลังบันทึก...',
    saveSuccess: 'บันทึกการขายเรียบร้อย ✓ (สต๊อกถูกหักอัตโนมัติแล้ว)',
    payMethods: [
      { key: 'cash', label: 'เงินสด',    sub: 'Cash',      icon: 'cash' },
      { key: 'qr',   label: 'โอน / QR',  sub: 'QR ร้าน',    icon: 'qrcode' },
      { key: 'card', label: 'บัตรเครดิต', sub: 'Visa / MC', icon: 'credit-card' },
    ],
  },
  en: {
    pageTitle: 'New Sale',
    addItem: 'Add Item', searchItem: 'Search name / SKU...',
    fromStock: 'From Stock', noStock: 'No items in stock',
    addMore: 'Add another item', noItems: 'No items selected',
    salePrice: 'Sale price', hasCert: 'Has Certificate',
    customer: 'Customer', searchMember: 'Search name / phone...',
    noCustomer: 'No customer',
    vipDisc: 'VIP Discount', extraDisc: 'Extra discount',
    priceItem: 'Item price', priceVip: 'VIP discount', priceExtra: 'Extra discount',
    vatLabel: 'VAT 7%', vatOn: 'Incl.', vatOff: 'Excl.', grandTotal: 'Grand total',
    payment: 'Payment method', payHint: 'Select multiple (split payment)',
    splitTitle: 'Split payment', remaining: 'Remaining', paid: 'Paid in full',
    confirmSale: (v) => `Confirm sale ฿${v}`,
    saving: 'Saving...',
    saveSuccess: 'Sale saved ✓ (stock deducted)',
    payMethods: [
      { key: 'cash', label: 'Cash',        sub: 'Physical',  icon: 'cash' },
      { key: 'qr',   label: 'Transfer/QR', sub: 'Shop QR',   icon: 'qrcode' },
      { key: 'card', label: 'Credit card', sub: 'Visa / MC', icon: 'credit-card' },
    ],
  },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};
const initials = (name) => {
  if (!name) return '—';
  const parts = name.replace(/^(คุณ|นาย|นาง|นางสาว|Mr\.|Ms\.|Mrs\.)\s*/, '').trim().split(' ');
  return parts.length > 1 ? (parts[0][0] + parts[1][0]) : (parts[0]?.slice(0, 2) || '—');
};

function Sec({ children }) {
  const { styles: s, sc, center, t: th } = useScaledStyles(baseStyles);
  return <View style={s.sec}>{children}</View>;
}
function SecHead({ icon, children }) {
  const { styles: s, sc, center, t: th } = useScaledStyles(baseStyles);
  return (
    <View style={s.secHead}>
      <MaterialCommunityIcons name={icon} size={sc(14)} color={th.brand} />
      <Text style={s.secHeadText}>{children}</Text>
    </View>
  );
}

export default function SaleScreen({ navigation, route }) {
  const { styles: s, sc, center, t: th } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [stockList, setStockList]     = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [customers, setCustomers]     = useState([]);

  useEffect(() => {
    api.getProducts({ available: 'true', light: 'true' }).then(setStockList).finally(() => setLoadingStock(false));
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const [cartItems, setCartItems]         = useState([]);
  const [showPicker, setShowPicker]       = useState(false);
  const [pickerQuery, setPickerQuery]     = useState('');
  const [showCustPicker, setShowCustPicker] = useState(false);
  const [custQuery, setCustQuery]         = useState('');
  const [selCustId, setSelCustId]         = useState(null);
  const [manualCust, setManualCust]       = useState('');   // ชื่อลูกค้าที่พิมพ์เอง (ไม่มีในระบบ)
  const [vatOn, setVatOn]                 = useState(false);   // ค่าเริ่มต้น: ไม่มี VAT
  const [vipOn, setVipOn]                 = useState(true);
  const [extraDisc, setExtraDisc]         = useState('0');
  const [selPay, setSelPay]               = useState(['qr']);  // ค่าเริ่มต้น: โอน/QR อย่างเดียว
  const [splitCash, setSplitCash]         = useState('0');
  const [splitQr, setSplitQr]             = useState(null);
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [saveSuccess, setSaveSuccess]     = useState(false);

  const selCust    = customers.find(c => c.id === selCustId);
  const subtotal   = cartItems.reduce((s, it) => s + it.price, 0);
  const vipAmt     = vipOn && selCust?.is_vip ? Math.round(subtotal * (Number(selCust.vip_discount_pct) || 0) / 100) : 0;
  const afterDisc  = subtotal - vipAmt - (parseFloat(extraDisc) || 0);
  const vatAmt     = vatOn ? Math.round(afterDisc * 0.07) : 0;
  const grandTotal = afterDisc + vatAmt;
  const cashVal    = parseFloat(String(splitCash).replace(/,/g, '')) || 0;
  const qrVal      = splitQr !== null ? (parseFloat(String(splitQr).replace(/,/g, '')) || 0) : Math.max(0, grandTotal - cashVal);
  const remaining  = grandTotal - cashVal - qrVal;

  // แบ่งยอดตามช่องทางที่เลือก
  //   เลือกช่องทางเดียว          → ช่องทางนั้นรับเต็มจำนวน (ไม่ต้องกรอกช่องแบ่งยอด)
  //   เลือกหลายช่องทาง           → ใช้ยอดที่กรอกในช่องแบ่งยอด (เงินสด / โอน-QR)
  //   ยอดที่ยังไม่ถูกแบ่ง         → ยกให้บัตรเครดิต (ไม่มีช่องกรอก) หรือช่องทางสุดท้ายที่เลือก
  // เดิมส่ง grandTotal ให้ทุกช่องทาง → เลือก 2 ช่องทาง ยอดที่บันทึกจะเป็น 2 เท่า
  const paymentBreakdown = () => {
    if (selPay.length === 0) return [];
    if (selPay.length === 1) return [{ method: selPay[0], amount: grandTotal }];

    const typed = { cash: cashVal, qr: qrVal };
    const rows  = selPay.map(m => ({ method: m, amount: Math.max(0, typed[m] || 0) }));

    const diff = grandTotal - rows.reduce((s, r) => s + r.amount, 0);
    if (diff !== 0) {
      const target = rows.find(r => r.method === 'card') || rows[rows.length - 1];
      target.amount = Math.max(0, target.amount + diff);
    }
    return rows.filter(r => r.amount > 0);
  };

  // ใช้เช็คจำนวนในตะกร้าได้ทันทีแม้อยู่ใน callback แบบ async (เช่นตอนสแกน)
  const cartRef = useRef(cartItems);
  cartRef.current = cartItems;
  const inCart = (id) => cartRef.current.filter(it => it.product_id === id).length;

  // เพิ่มลงตะกร้าได้หลายชิ้น แต่ไม่เกินจำนวนคงเหลือในสต๊อก
  const addToCart = (product) => {
    const max  = parseInt(product.stock_qty, 10) || 0;
    const have = inCart(product.id);
    if (max > 0 && have >= max) {
      setScanNote({ reason: 'max', text: `${product.name} · ${lang === 'th' ? `มีในสต๊อก ${max} ชิ้น` : `only ${max} in stock`}` });
      return false;
    }
    setCartItems(prev => [...prev, {
      product_id: product.id, name: product.name, sku: product.sku,
      metal_type: product.metal_type, has_certificate: product.has_certificate,
      certificate_no: product.certificate_no, diamonds: product.diamonds || [],
      price: Number(product.sale_price),
    }]);
    return true;
  };

  // ══════════ สแกน QR บนป้ายสินค้า ══════════
  // ใช้ร่วมกัน 3 ทาง: (1) ลิงก์จากป้าย (2) กล้องในหน้าเว็บ (3) เครื่องสแกนบาร์โค้ด USB
  const [scanNote, setScanNote] = useState(null);   // { ok } | { reason }
  const [scanOpen, setScanOpen] = useState(false);  // เปิดกล้องในหน้า

  // ── รอชำระเงินผ่าน QR (Omise) ──
  // เก็บบิล + ช่องทางหลักไว้ด้วย เพราะใบเสร็จจะออกหลังเงินเข้าแล้วเท่านั้น
  const [qrPending, setQrPending] = useState(null);   // { payment, sale, mainPay }
  const stockRef = useRef(stockList);
  stockRef.current = stockList;

  // เพิ่มสินค้าลงตะกร้าจากรหัสที่สแกนได้ (รับได้ทั้ง URL จากป้าย และรหัสดิบ)
  const addBySku = async (raw) => {
    const code = parseScanned(raw);
    const key  = normSku(code);
    if (!key) { setScanNote({ reason: 'notfound', text: String(raw).slice(0, 40) }); return; }
    const use = (p) => { addToCart(p); setScanNote({ ok: true, text: `${p.name} · ${p.sku}` }); };

    // 1) หาในรายการ "พร้อมขาย" ที่โหลดไว้แล้วก่อน
    const local = stockRef.current.find(x => normSku(x.sku) === key);
    if (local) { use(local); return; }

    // 2) ไม่เจอ → ถามเซิร์ฟเวอร์ตรง ๆ (เผื่อสินค้าถูกปิดขาย / รายการยังไม่อัปเดต)
    setScanNote({ reason: 'busy', text: code });
    try {
      const rows = await api.getProducts({ search: key, light: 'true' });
      const hit = (rows || []).find(x => normSku(x.sku) === key);
      if (!hit) { setScanNote({ reason: 'notfound', text: code }); return; }
      if (hit.is_available === false) { setScanNote({ reason: 'sold', text: `${hit.name} · ${hit.sku}` }); return; }
      use(hit);
    } catch (_) {
      setScanNote({ reason: 'error', text: code });
    }
  };

  // (1) เปิดเว็บมาจากลิงก์บนป้าย — ทำครั้งเดียวหลังโหลดสต๊อกเสร็จ
  const scanSku = route?.params?.scanSku;
  const linkDone = useRef(new Set());
  useEffect(() => {
    if (!scanSku || loadingStock || linkDone.current.has(scanSku)) return;
    linkDone.current.add(scanSku);
    navigation.setParams({ scanSku: undefined });
    addBySku(scanSku);
  }, [scanSku, loadingStock, stockList]);

  // (3) เครื่องสแกนบาร์โค้ด USB — ทำตัวเหมือนคีย์บอร์ด พิมพ์รวดเดียวแล้วกด Enter
  //     ข้ามไปถ้ากำลังพิมพ์อยู่ในช่องกรอก (เช่น ชื่อลูกค้า) จะได้ไม่รบกวนกัน
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let buf = '', last = 0;
    const onKey = (e) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      const now = Date.now();
      if (now - last > 120) buf = '';   // เว้นช่วงนาน = คนพิมพ์เอง ไม่ใช่เครื่องสแกน
      last = now;
      if (e.key === 'Enter') {
        const code = buf.trim();
        buf = '';
        if (!typing && code.length >= 3) addBySku(code);
        return;
      }
      if (e.key.length === 1) buf += e.key;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const filteredStock = stockList.filter(p =>
    !pickerQuery.trim() ||
    p.name.toLowerCase().includes(pickerQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(pickerQuery.toLowerCase())
  );
  const filteredCusts = customers.filter(c =>
    !custQuery.trim() ||
    c.full_name.toLowerCase().includes(custQuery.toLowerCase()) ||
    (c.phone || '').includes(custQuery)
  );

  // ── PromptPay ผ่าน Omise: ปิดไว้ก่อน (30 ก.ย. 2569) ──────────────
  // ร้านยังไม่ได้คีย์ API ตัวจริง ตอนนี้ใช้ QR ของร้านเองที่ติดหน้าเคาน์เตอร์
  // เงินจึงเข้านอกระบบ บิลต้องปิดเป็น "ขายสำเร็จ" ทันทีเหมือนเงินสด
  //
  // ถ้าปล่อยให้เรียก createPromptPay ต่อ หลังบ้านจะสั่ง
  //     UPDATE sales SET status = 'pending'
  // แล้วรอ Omise ยืนยันว่าจ่ายจริง — ซึ่งไม่มีวันมา บิลจะค้างตลอดไป
  // และไม่ถูกนับในหน้าสรุปยอด (สรุปยอดนับเฉพาะ status = 'completed')
  //
  // ได้คีย์จริงเมื่อไหร่ เปลี่ยนเป็น true อย่างเดียว เส้นทางเดิมกลับมาครบ
  const OMISE_QR_ENABLED = false;

  const PAY_MAP = { cash: 'cash', qr: 'transfer', transfer: 'transfer', card: 'card' };

  // ออกใบเสร็จอัตโนมัติแล้วเด้งไปหน้าใบเสร็จเพื่อสั่งปริ้น
  const issueReceiptAndGo = async (sale, mainPay) => {
    try {
      const rc = await api.createReceipt({
        sale_id: sale.id,
        payment_method: PAY_MAP[mainPay] || 'other',
      });
      navigation.navigate('Receipt', rc?.id ? { openReceiptId: rc.id } : undefined);
    } catch (e) {
      // การขายบันทึกแล้ว แต่ออกใบเสร็จอัตโนมัติไม่สำเร็จ — แจ้งให้เห็น (ไม่เงียบ) + พาไปออกเอง
      setSaveError((lang === 'th' ? 'บันทึกการขายแล้ว แต่ออกใบเสร็จอัตโนมัติไม่สำเร็จ: ' : 'Sale saved but auto-receipt failed: ') + (e?.message || ''));
      navigation.navigate('Receipt');
    }
  };

  const handleConfirm = async () => {
    if (cartItems.length === 0) { setSaveError(lang === 'th' ? 'กรุณาเพิ่มสินค้าก่อน' : 'Please add items first'); return; }
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      // ชื่อลูกค้า: ใช้ที่กด "ใช้ชื่อ ..." ก่อน ถ้าไม่มีก็เอาที่พิมพ์ค้างไว้ในช่องค้นหา
      // (เดิมถ้าพิมพ์ชื่อแล้วกดยืนยันเลย โดยไม่กดปุ่ม "ใช้ชื่อ" ชื่อจะหายกลายเป็น "ไม่ระบุ")
      const custName = (manualCust.trim() || custQuery.trim());
      const payRows  = paymentBreakdown();
      const sale = await api.createSale({
        customer_id: selCustId,
        customer_name: !selCustId && custName ? custName : undefined,
        items: cartItems.map(it => ({ product_id: it.product_id, qty: 1, unit_price: it.price })),
        vip_discount: vipAmt,
        extra_discount: parseFloat(extraDisc) || 0,
        vat_enabled: vatOn,
        payment_methods: payRows,
      });
      setSaveSuccess(true);
      setCartItems([]); setExtraDisc('0'); setSplitCash('0'); setSplitQr(null); setManualCust(''); setCustQuery('');
      api.getProducts({ available: 'true', light: 'true' }).then(setStockList);

      // ใบเสร็จรับช่องทางเดียว → เลือกช่องทางที่จ่ายมากที่สุด (เดิมใช้ตัวแรกที่ติ๊ก
      // ซึ่งอาจเป็นช่องที่จ่าย 0 บาท เช่น ติ๊กเงินสดไว้แต่จ่ายด้วย QR ทั้งหมด)
      const mainPay = payRows.slice().sort((a, b) => b.amount - a.amount)[0]?.method || selPay[0];
      const qrRow   = payRows.find(r => r.method === 'qr');

      // ── มียอดที่จ่ายผ่าน QR → สร้าง QR แล้วรอเงินเข้าก่อน ค่อยออกใบเสร็จ ──
      if (qrRow && OMISE_QR_ENABLED) {
        try {
          const payment = await api.createPromptPay({ sale_id: sale.id, amount: qrRow.amount });
          setQrPending({ payment, sale, mainPay });
          return;
        } catch (e) {
          // สร้าง QR ไม่สำเร็จ (เช่น ยอดเกินเพดาน / คีย์ยังไม่ได้ตั้ง) — บิลบันทึกไปแล้ว
          // ไม่ปล่อยให้ค้าง ให้ออกใบเสร็จตามปกติแล้วแจ้งเตือนไว้
          setSaveError((lang === 'th' ? 'บันทึกการขายแล้ว แต่สร้าง QR ไม่สำเร็จ: ' : 'Sale saved but QR failed: ') + (e?.message || ''));
        }
      }

      await issueReceiptAndGo(sale, mainPay);
    } catch (err) {
      setSaveError(err.message || 'ไม่สามารถบันทึกการขายได้');
    } finally {
      setSaving(false);
    }
  };

  const wide = useWide(1000);
  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: insets.top }}>
      <Header title={t.pageTitle} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loadingStock} lang={lang} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {!!saveError && <View style={s.errBox}><Text style={s.errText}>{saveError}</Text></View>}
        {saveSuccess && <View style={s.okBox}><Text style={s.okText}>{t.saveSuccess}</Text></View>}

        {/* แจ้งผลการสแกน QR จากป้ายสินค้า */}
        {!!scanNote && (() => {
          const th = lang === 'th';
          const M = {
            busy:     { icon: 'magnify',              msg: th ? `กำลังค้นหา ${scanNote.text}...` : `Searching ${scanNote.text}...` },
            notfound: { icon: 'alert-circle-outline', msg: th ? `ไม่พบรหัส ${scanNote.text} ในระบบ — ตรวจว่าป้ายนี้เป็นของสินค้าที่บันทึกไว้แล้วหรือยัง` : `Code ${scanNote.text} not found` },
            sold:     { icon: 'cart-off',             msg: th ? `${scanNote.text} — สินค้านี้ถูกปิดการขายไว้ (อาจขายไปแล้ว)` : `${scanNote.text} — item is not available` },
            max:      { icon: 'package-variant',      msg: th ? `เลือกครบจำนวนที่มีแล้ว: ${scanNote.text}` : `Already at stock limit: ${scanNote.text}` },
            error:    { icon: 'wifi-off',             msg: th ? `ค้นหาไม่สำเร็จ (${scanNote.text}) — เช็กอินเทอร์เน็ตแล้วสแกนใหม่` : `Lookup failed (${scanNote.text})` },
          };
          const info = scanNote.ok
            ? { icon: 'qrcode-scan', msg: th ? `เพิ่มจากการสแกน: ${scanNote.text}` : `Added from scan: ${scanNote.text}` }
            : M[scanNote.reason] || M.notfound;
          const good = scanNote.ok || scanNote.reason === 'busy';
          return (
            <View style={[s.scanBox, !good && s.scanBoxErr]}>
              <MaterialCommunityIcons name={info.icon} size={sc(16)} color={good ? th.ok : th.danger} />
              <Text style={[s.scanText, !good && { color: th.danger }]}>{info.msg}</Text>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setScanNote(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={sc(14)} color={good ? th.ok : th.danger} />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* จอกว้าง = สองคอลัมน์ (ซ้าย: สินค้าในบิล · ขวา: ลูกค้า + สรุปยอด + ชำระเงิน) */}
        <View style={[s.cols, !wide && s.colsNarrow]}>
        <View style={[s.colMain, !wide && s.colFull]}>

        {/* ADD ITEMS */}
        <Sec>
          <SecHead icon="magnify">{t.addItem}</SecHead>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowPicker(true)} style={s.searchBar}>
            <MaterialCommunityIcons name="magnify" size={sc(15)} color={th.dim} />
            <Text style={s.searchPh}>{t.searchItem}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowPicker(true)} style={[s.fromStockBtn, { flex: 1 }]}>
              <MaterialCommunityIcons name="view-list" size={sc(16)} color={th.brand} />
              <Text style={s.fromStockText}>{t.fromStock} ({stockList.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { setScanNote(null); setScanOpen(true); }} style={s.scanBtn}>
              <MaterialCommunityIcons name="qrcode-scan" size={sc(16)} color={th.brandOn} />
              <Text style={s.scanBtnText}>{lang === 'th' ? 'สแกน QR' : 'Scan QR'}</Text>
            </TouchableOpacity>
          </View>

          {cartItems.length === 0
            ? <Text style={s.emptyText}>{t.noItems}</Text>
            : cartItems.map((it, idx) => (
              <View key={idx} style={s.cartCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cartName}>{it.name}</Text>
                    <Text style={s.cartSku}>{it.sku} · {it.metal_type || '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setCartItems(prev => prev.filter((_, i) => i !== idx))} style={s.removeBtn}>
                      <MaterialCommunityIcons name="close" size={sc(11)} color={th.brand} />
                    </TouchableOpacity>
                    <Text style={s.cartPrice}>฿{fmt(it.price)}</Text>
                  </View>
                </View>
                {it.has_certificate && (
                  <View style={s.certTag}>
                    <Text style={s.certTagText}>{t.hasCert}</Text>
                  </View>
                )}
              </View>
            ))
          }

          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowPicker(true)} style={s.addMoreBtn}>
            <MaterialCommunityIcons name="plus" size={sc(14)} color={th.dim} />
            <Text style={s.addMoreText}>{t.addMore}</Text>
          </TouchableOpacity>
        </Sec>

        </View>
        <View style={[s.colSide, !wide && s.colFull]}>

        {/* CUSTOMER */}
        <Sec>
          <SecHead icon="account">{t.customer}</SecHead>
          {/* พิมพ์ = ค้นหาในตัว + ใช้ชื่อที่พิมพ์เองได้ (ลูกค้า walk-in) */}
          {!selCust && !manualCust && (
            <>
              <View style={s.searchBar}>
                <MaterialCommunityIcons name="magnify" size={sc(15)} color={th.dim} />
                <TextInput dataSet={{ hov: 'field' }}
                  style={s.searchInput}
                  value={custQuery}
                  onChangeText={setCustQuery}
                  placeholder={t.searchMember}
                  placeholderTextColor={th.dim}
                />
                {!!custQuery && (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setCustQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={sc(15)} color={th.faint} />
                  </TouchableOpacity>
                )}
              </View>
              {!!custQuery.trim() && (
                <View style={s.custResults}>
                  {filteredCusts.slice(0, 5).map(c => (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} key={c.id} onPress={() => { setSelCustId(c.id); setCustQuery(''); }} style={s.custResultRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.custName}>{c.full_name}</Text>
                        <Text style={s.custSub}>{c.phone || '—'}</Text>
                      </View>
                      {c.is_vip && <View style={s.vipBadge}><Text style={s.vipText}>VIP</Text></View>}
                    </TouchableOpacity>
                  ))}
                  {/* ไม่มีในระบบ → ใช้ชื่อที่พิมพ์ */}
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { setManualCust(custQuery.trim()); setCustQuery(''); }} style={s.custAddRow}>
                    <MaterialCommunityIcons name="account-plus" size={sc(15)} color={th.brand} />
                    <Text style={s.custAddText}>
                      {lang === 'th' ? `ใช้ชื่อ "${custQuery.trim()}"` : `Use "${custQuery.trim()}"`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          {/* ลูกค้าที่พิมพ์ชื่อเอง */}
          {manualCust && !selCust && (
            <View style={s.custCard}>
              <View style={s.custAvatar}>
                <Text style={s.custAvatarText}>{initials(manualCust)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.custName}>{manualCust}</Text>
                <Text style={s.custSub}>{lang === 'th' ? 'ลูกค้าใหม่ (พิมพ์เอง)' : 'New customer'}</Text>
              </View>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setManualCust('')} style={s.removeBtn}>
                <MaterialCommunityIcons name="close" size={sc(10)} color={th.brand} />
              </TouchableOpacity>
            </View>
          )}
          {selCust ? (
            <View style={s.custCard}>
              <View style={s.custAvatar}>
                <Text style={s.custAvatarText}>{initials(selCust.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.custName}>{selCust.full_name}</Text>
                <Text style={s.custSub}>{selCust.phone || '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {selCust.is_vip && <View style={s.vipBadge}><Text style={s.vipText}>VIP</Text></View>}
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setSelCustId(null)} style={s.removeBtn}>
                  <MaterialCommunityIcons name="close" size={sc(10)} color={th.brand} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (!manualCust && !custQuery.trim() && (
            <Text style={[s.emptyText, { marginBottom: 0 }]}>{t.noCustomer}</Text>
          ))}

          {selCust?.is_vip && (
            <View style={s.toggleRow}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setVipOn(v => !v)} style={[s.toggle, { backgroundColor: vipOn ? th.brandBg : th.line2 }]}>
                <View style={[s.toggleKnob, { left: vipOn ? 18 : 2 }]} />
              </TouchableOpacity>
              <Text style={s.toggleLabel}>{t.vipDisc} ({selCust.vip_discount_pct}%)</Text>
              <Text style={s.discAmt}>{vipOn ? `− ฿${fmt(vipAmt)}` : '—'}</Text>
            </View>
          )}
          <View style={s.extraRow}>
            <Text style={s.extraLabel}>{t.extraDisc}</Text>
            <TextInput dataSet={{ hov: 'field' }}
              style={s.smallInput}
              value={extraDisc}
              onChangeText={setExtraDisc}
              keyboardType="numeric"
            />
          </View>
        </Sec>

        {/* PRICE SUMMARY */}
        <View style={s.priceSec}>
          {[
            [t.priceItem,  `฿${fmt(subtotal)}`,                   th.ink],
            [t.priceVip,   vipAmt ? `− ฿${fmt(vipAmt)}` : '—',   '#2e7d32'],
            [t.priceExtra, `− ฿${fmt(parseFloat(extraDisc)||0)}`, th.ink],
          ].map(([l, v, c]) => (
            <View key={l} style={s.priceRow}>
              <Text style={s.priceLabel}>{l}</Text>
              <Text style={[s.priceVal, { color: c }]}>{v}</Text>
            </View>
          ))}
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>{t.vatLabel}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.priceVal}>{vatOn ? `฿${fmt(vatAmt)}` : '—'}</Text>
              <View style={s.vatToggle}>
                {[[t.vatOn, true],[t.vatOff, false]].map(([label, val]) => (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} key={label} onPress={() => setVatOn(val)}
                    style={[s.vatOption, { backgroundColor: vatOn === val ? th.brandBg : th.card }]}>
                    <Text style={[s.vatOptionText, { color: vatOn === val ? th.brandOn : th.muted2 }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={[s.priceRow, { borderTopWidth: 0.5, borderTopColor: th.line3, marginTop: 7, paddingTop: 7 }]}>
            <Text style={s.grandLabel}>{t.grandTotal}</Text>
            <Text style={s.grandVal}>฿{fmt(grandTotal)}</Text>
          </View>
        </View>

        {/* PAYMENT */}
        <Sec>
          <SecHead icon="credit-card">{t.payment}</SecHead>
          <Text style={s.payHint}>{t.payHint}</Text>
          <View style={s.payRow}>
            {t.payMethods.map(m => {
              const on = selPay.includes(m.key);
              return (
                <TouchableOpacity dataSet={{ hov: 'btn' }} key={m.key} onPress={() => setSelPay(p => p.includes(m.key) ? p.filter(k => k !== m.key) : [...p, m.key])}
                  style={[s.payCard, { borderColor: on ? th.brandBg : th.softer, borderWidth: on ? 1.5 : 0.5, backgroundColor: on ? th.soft : th.card }]}>
                  <MaterialCommunityIcons name={m.icon} size={sc(18)} color={on ? th.brand : th.ok} />
                  <Text style={[s.payCardLabel, { color: th.ink }]}>{m.label}</Text>
                  {on && <MaterialCommunityIcons name="check" size={sc(12)} color={th.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {(selPay.includes('cash') || selPay.includes('qr')) && (
            <View style={s.splitBox}>
              <Text style={s.splitTitle}>{t.splitTitle}</Text>
              {selPay.includes('cash') && (
                <View style={s.splitRow}>
                  <MaterialCommunityIcons name="cash" size={sc(18)} color={th.ok} />
                  <Text style={s.splitLabel}>{lang === 'th' ? 'เงินสด' : 'Cash'}</Text>
                  <TextInput dataSet={{ hov: 'field' }} style={s.splitInput} value={splitCash} onChangeText={setSplitCash} keyboardType="numeric" />
                </View>
              )}
              {selPay.includes('qr') && (
                <View style={s.splitRow}>
                  <MaterialCommunityIcons name="qrcode" size={sc(18)} color={th.ok} />
                  <Text style={s.splitLabel}>{lang === 'th' ? 'โอน / QR' : 'Transfer'}</Text>
                  <TextInput dataSet={{ hov: 'field' }} style={s.splitInput} value={splitQr !== null ? String(splitQr) : String(qrVal)} onChangeText={setSplitQr} keyboardType="numeric" />
                </View>
              )}
              <View style={[s.splitRow, { borderTopWidth: 0.5, borderTopColor: th.line2, paddingTop: 7, marginTop: 2 }]}>
                <Text style={s.splitLabel}>{t.remaining}</Text>
                <Text style={[s.splitInput, { textAlign: 'right', fontWeight: '600', color: remaining <= 0 ? th.ok : '#c62828', borderWidth: 0 }]}>
                  {remaining <= 0 ? `฿0 ${t.paid}` : `฿${fmt(remaining)}`}
                </Text>
              </View>
            </View>
          )}
        </Sec>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleConfirm} disabled={saving || cartItems.length === 0}
          style={[s.confirmBtn, { opacity: (saving || cartItems.length === 0) ? 0.6 : 1 }]}>
          {saving ? <ActivityIndicator color={th.brandOn} size="small" /> : <MaterialCommunityIcons name="check" size={sc(18)} color={th.brandOn} />}
          <Text style={s.confirmBtnText}>{saving ? t.saving : t.confirmSale(fmt(grandTotal))}</Text>
        </TouchableOpacity>

        </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* STOCK PICKER MODAL */}
      <ShellModal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t.fromStock}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowPicker(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color={th.brand} />
            </TouchableOpacity>
          </View>
          <TextInput dataSet={{ hov: 'field' }}
            style={s.modalSearch}
            value={pickerQuery}
            onChangeText={setPickerQuery}
            placeholder={t.searchItem}
            placeholderTextColor={th.dim}
            autoFocus
          />
          {loadingStock
            ? <ActivityIndicator style={{ marginTop: 20 }} color={th.brand} />
            : (
              <FlatList
                data={filteredStock}
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={<Text style={s.emptyText}>{t.noStock}</Text>}
                renderItem={({ item }) => {
                  const max  = parseInt(item.stock_qty, 10) || 0;
                  const have = cartItems.filter(it => it.product_id === item.id).length;
                  const full = max > 0 && have >= max;
                  return (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => addToCart(item)} disabled={full}
                      style={[s.stockRow, full && { opacity: 0.45 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.stockName}>{item.name}</Text>
                        <Text style={s.stockSku}>
                          {item.sku} · {item.metal_type || '—'} · คงเหลือ {max}
                          {have > 0 ? `  •  เลือกแล้ว ${have}` : ''}
                        </Text>
                      </View>
                      <Text style={s.stockPrice}>฿{fmt(item.sale_price)}</Text>
                      <MaterialCommunityIcons
                        name={full ? 'check-circle' : 'plus-circle-outline'}
                        size={sc(20)} color={full ? th.ok : th.brand} style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                  );
                }}
              />
            )
          }
          {/* แถบล่าง — เลือกหลายชิ้นติดกันได้ แล้วค่อยกดเสร็จ */}
          <View style={s.pickFoot}>
            <Text style={s.pickFootText}>
              {lang === 'th' ? `ในตะกร้า ${cartItems.length} ชิ้น` : `${cartItems.length} in cart`}
            </Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { setShowPicker(false); setPickerQuery(''); }} style={s.pickDoneBtn}>
              <MaterialCommunityIcons name="check" size={sc(16)} color={th.brandOn} />
              <Text style={s.pickDoneText}>{lang === 'th' ? 'เสร็จแล้ว' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ShellModal>

      {/* CUSTOMER PICKER MODAL */}
      <ShellModal visible={showCustPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t.customer}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowCustPicker(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color={th.brand} />
            </TouchableOpacity>
          </View>
          <TextInput dataSet={{ hov: 'field' }}
            style={s.modalSearch}
            value={custQuery}
            onChangeText={setCustQuery}
            placeholder={t.searchMember}
            placeholderTextColor={th.dim}
            autoFocus
          />
          <FlatList
            data={filteredCusts}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={<Text style={s.emptyText}>{lang === 'th' ? 'ไม่พบลูกค้า' : 'No customers'}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => { setSelCustId(item.id); setShowCustPicker(false); setCustQuery(''); }} style={s.stockRow}>
                <Text style={{ flex: 1, fontSize: 14, color: th.ink }}>{item.full_name}</Text>
                {item.is_vip && <View style={s.vipBadge}><Text style={s.vipText}>VIP</Text></View>}
              </TouchableOpacity>
            )}
          />
        </View>
      </ShellModal>

      {/* กล้องสแกน QR — สแกนติดกันหลายชิ้นได้ ตะกร้าไม่หาย */}
      <QrScanner
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={addBySku}
        note={scanNote}
        count={cartItems.length}
        lang={lang}
      />

      {/* รอลูกค้าสแกนจ่ายด้วย PromptPay — ใบเสร็จออกหลังเงินเข้าเท่านั้น */}
      {qrPending && (
        <PromptPayModal
          payment={qrPending.payment}
          lang={lang}
          onPaid={() => { /* รอผู้ใช้กด "ออกใบเสร็จ" เอง จะได้เห็นเครื่องหมายถูกก่อน */ }}
          onClose={async () => {
            const { sale, mainPay, payment } = qrPending;
            setQrPending(null);
            // เช็คสถานะล่าสุดอีกที — จ่ายแล้วค่อยออกใบเสร็จ
            try {
              const p = await api.getPayment(payment.id);
              if (p.status === 'successful') await issueReceiptAndGo(sale, mainPay);
            } catch (_) {}
          }}
        />
      )}
    </View>
  );
}

const baseStyles = (th) => ({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 30 },
  cols:    { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  colMain: { flexGrow: 1.55, flexShrink: 1, flexBasis: 420, minWidth: 0 },
  colSide: { flexGrow: 1, flexShrink: 1, flexBasis: 330, minWidth: 0 },
  // จอแคบ: เรียงลงมาและกว้างเต็มจอ — ไม่งั้น alignItems:'flex-start' จะบีบแต่ละกล่องให้หดตามเนื้อหา
  colsNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  colFull:    { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', alignSelf: 'stretch' },
  errBox: { backgroundColor: th.soft, borderWidth: 0.5, borderColor: th.line3, borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: th.danger },
  okBox:  { backgroundColor: th.okBg, borderWidth: 0.5, borderColor: th.ok, borderRadius: 8, padding: 10, marginBottom: 10 },
  okText: { fontSize: 12, color: th.ok },
  scanBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: th.okBg, borderWidth: 0.5, borderColor: th.ok, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10 },
  scanBoxErr: { backgroundColor: th.soft, borderColor: th.line3 },
  scanText:   { flex: 1, fontSize: 12, color: th.ok, fontWeight: '500' },
  sec: { backgroundColor: th.card, borderRadius: 12, borderWidth: 0.5, borderColor: th.line2, padding: 12, marginBottom: 10 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  secHeadText: { fontSize: 11, fontWeight: '500', color: th.brand, letterSpacing: 1.5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: th.card2, borderRadius: 10, borderWidth: 0.5, borderColor: th.line2, padding: 10, marginBottom: 8 },
  searchPh: { fontSize: 13, color: th.dim },
  searchInput:   { flex: 1, fontSize: 13, color: th.ink, paddingVertical: 0 },
  custResults:   { borderWidth: 0.5, borderColor: th.line2, borderRadius: 10, marginTop: 6, overflow: 'hidden', backgroundColor: th.card },
  custResultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  custAddRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: th.soft },
  custAddText:   { fontSize: 13, fontWeight: '600', color: th.brand },
  fromStockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: th.card, borderRadius: 10, borderWidth: 0.5, borderColor: th.line3, padding: 10, marginBottom: 10 },
  fromStockText: { fontSize: 12, fontWeight: '500', color: th.brand },
  scanBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: th.brandBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  scanBtnText: { fontSize: 12, fontWeight: '600', color: th.brandOn },
  pickFoot:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 0.5, borderTopColor: th.line2, paddingTop: 12, paddingBottom: 4, marginTop: 4 },
  pickFootText:{ fontSize: 12.5, fontWeight: '600', color: th.ink },
  pickDoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: th.brandBg, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  pickDoneText:{ fontSize: 13.5, fontWeight: '700', color: th.brandOn },
  cartCard: { backgroundColor: th.card, borderRadius: 12, borderWidth: 1.5, borderColor: th.brandBg, padding: 12, marginBottom: 8 },
  cartName: { fontSize: 13, fontWeight: '500', color: th.ink },
  cartSku: { fontSize: 10, color: th.muted2, marginTop: 2 },
  cartPrice: { fontSize: 15, fontWeight: '500', color: th.brand, marginTop: 4 },
  removeBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: th.soft, borderWidth: 0.5, borderColor: th.line3, justifyContent: 'center', alignItems: 'center' },
  certTag: { marginTop: 6, backgroundColor: th.soft, borderWidth: 0.5, borderColor: th.line3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  certTagText: { fontSize: 10, color: th.brand },
  emptyText: { fontSize: 12, color: th.muted2, textAlign: 'center', paddingVertical: 10 },
  addMoreBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: th.line3, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addMoreText: { fontSize: 12, color: th.dim },
  custCard: { backgroundColor: th.soft, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  custAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: th.brandBg, justifyContent: 'center', alignItems: 'center' },
  custAvatarText: { fontSize: 12, fontWeight: '500', color: th.brandOn },
  custName: { fontSize: 13, fontWeight: '500', color: th.ink },
  custSub:  { fontSize: 11, color: th.muted2, marginTop: 1 },
  vipBadge: { backgroundColor: th.brandBg, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  vipText:  { fontSize: 9, fontWeight: '500', color: th.brandOn },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  toggle: { width: 36, height: 20, borderRadius: 10, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: th.card },
  toggleLabel: { fontSize: 12, color: th.brand, fontWeight: '500', flex: 1 },
  discAmt: { fontSize: 13, fontWeight: '500', color: th.ok },
  extraRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: th.card2, borderRadius: 8, padding: 8 },
  extraLabel: { fontSize: 11, color: th.muted2 },
  smallInput: { backgroundColor: th.card, borderWidth: 0.5, borderColor: th.line2, borderRadius: 7, padding: 5, fontSize: 13, fontWeight: '500', color: th.brand, width: 80, textAlign: 'right' },
  priceSec: { backgroundColor: th.softer, borderRadius: 10, borderWidth: 0.5, borderColor: th.line3, padding: 12, marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  priceLabel: { fontSize: 13, color: th.dim },
  priceVal:   { fontSize: 13, fontWeight: '500' },
  grandLabel: { fontSize: 14, fontWeight: '500', color: th.brand },
  grandVal:   { fontSize: 20, fontWeight: '500', color: th.brand },
  vatToggle:  { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: th.line3 },
  vatOption:  { paddingHorizontal: 11, paddingVertical: 4 },
  vatOptionText: { fontSize: 11, fontWeight: '500' },
  payHint: { fontSize: 11, color: th.muted2, marginBottom: 8 },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  payCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  payCardLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  splitBox: { backgroundColor: th.card, borderRadius: 10, borderWidth: 0.5, borderColor: th.line2, padding: 10 },
  splitTitle: { fontSize: 11, color: th.muted2, marginBottom: 8 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  splitLabel: { fontSize: 12, color: th.dim, flex: 1 },
  splitInput: { backgroundColor: th.card2, borderWidth: 0.5, borderColor: th.line2, borderRadius: 7, padding: 6, fontSize: 13, fontWeight: '500', color: th.brand, width: 90, textAlign: 'right' },
  confirmBtn: { backgroundColor: th.brandBg, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  confirmBtnText: { fontSize: 15, fontWeight: '500', color: th.brandOn },
  modal: { flex: 1, backgroundColor: th.card, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: th.brand },
  modalSearch: { backgroundColor: th.card2, borderWidth: 0.5, borderColor: th.line2, borderRadius: 10, padding: 10, fontSize: 14, color: th.ink, marginBottom: 10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: th.hair },
  stockName: { fontSize: 13, fontWeight: '500', color: th.ink },
  stockSku: { fontSize: 10, color: th.muted2 },
  stockPrice: { fontSize: 13, fontWeight: '500', color: th.brand },
});
