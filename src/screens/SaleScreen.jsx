// ══════════════════════════════════════════════════════
// SaleScreen.jsx — React Native version of AnakynSalePage
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { api } from '../api';

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
      { key: 'qr',   label: 'โอน / QR',  sub: 'PromptPay', icon: 'qrcode' },
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
      { key: 'qr',   label: 'Transfer/QR', sub: 'PromptPay', icon: 'qrcode' },
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
  return <View style={s.sec}>{children}</View>;
}
function SecHead({ icon, children }) {
  return (
    <View style={s.secHead}>
      <MaterialCommunityIcons name={icon} size={14} color="#550a19" />
      <Text style={s.secHeadText}>{children}</Text>
    </View>
  );
}

export default function SaleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [stockList, setStockList]     = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [customers, setCustomers]     = useState([]);

  useEffect(() => {
    api.getProducts({ available: 'true' }).then(setStockList).finally(() => setLoadingStock(false));
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const [cartItems, setCartItems]         = useState([]);
  const [showPicker, setShowPicker]       = useState(false);
  const [pickerQuery, setPickerQuery]     = useState('');
  const [showCustPicker, setShowCustPicker] = useState(false);
  const [custQuery, setCustQuery]         = useState('');
  const [selCustId, setSelCustId]         = useState(null);
  const [vatOn, setVatOn]                 = useState(true);
  const [vipOn, setVipOn]                 = useState(true);
  const [extraDisc, setExtraDisc]         = useState('0');
  const [selPay, setSelPay]               = useState(['cash', 'qr']);
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

  const addToCart = (product) => {
    setCartItems(prev => [...prev, {
      product_id: product.id, name: product.name, sku: product.sku,
      metal_type: product.metal_type, has_certificate: product.has_certificate,
      certificate_no: product.certificate_no, diamonds: product.diamonds || [],
      price: Number(product.sale_price),
    }]);
    setShowPicker(false); setPickerQuery('');
  };

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

  const handleConfirm = async () => {
    if (cartItems.length === 0) { setSaveError(lang === 'th' ? 'กรุณาเพิ่มสินค้าก่อน' : 'Please add items first'); return; }
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      await api.createSale({
        customer_id: selCustId,
        items: cartItems.map(it => ({ product_id: it.product_id, qty: 1, unit_price: it.price })),
        vip_discount: vipAmt,
        extra_discount: parseFloat(extraDisc) || 0,
        vat_enabled: vatOn,
        payment_methods: selPay.map(key => ({ method: key, amount: grandTotal })),
      });
      setSaveSuccess(true);
      setCartItems([]); setExtraDisc('0'); setSplitCash('0'); setSplitQr(null);
      api.getProducts({ available: 'true' }).then(setStockList);
    } catch (err) {
      setSaveError(err.message || 'ไม่สามารถบันทึกการขายได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={t.pageTitle} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {!!saveError && <View style={s.errBox}><Text style={s.errText}>{saveError}</Text></View>}
        {saveSuccess && <View style={s.okBox}><Text style={s.okText}>{t.saveSuccess}</Text></View>}

        {/* ADD ITEMS */}
        <Sec>
          <SecHead icon="magnify">{t.addItem}</SecHead>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={s.searchBar}>
            <MaterialCommunityIcons name="magnify" size={15} color="#b08090" />
            <Text style={s.searchPh}>{t.searchItem}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={s.fromStockBtn}>
            <MaterialCommunityIcons name="view-list" size={16} color="#550a19" />
            <Text style={s.fromStockText}>{t.fromStock} ({stockList.length})</Text>
          </TouchableOpacity>

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
                    <TouchableOpacity onPress={() => setCartItems(prev => prev.filter((_, i) => i !== idx))} style={s.removeBtn}>
                      <MaterialCommunityIcons name="close" size={11} color="#550a19" />
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

          <TouchableOpacity onPress={() => setShowPicker(true)} style={s.addMoreBtn}>
            <MaterialCommunityIcons name="plus" size={14} color="#b08090" />
            <Text style={s.addMoreText}>{t.addMore}</Text>
          </TouchableOpacity>
        </Sec>

        {/* CUSTOMER */}
        <Sec>
          <SecHead icon="account">{t.customer}</SecHead>
          <TouchableOpacity onPress={() => setShowCustPicker(true)} style={s.searchBar}>
            <MaterialCommunityIcons name="magnify" size={15} color="#b08090" />
            <Text style={s.searchPh}>{t.searchMember}</Text>
          </TouchableOpacity>
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
                <TouchableOpacity onPress={() => setSelCustId(null)} style={s.removeBtn}>
                  <MaterialCommunityIcons name="close" size={10} color="#550a19" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[s.emptyText, { marginBottom: 0 }]}>{t.noCustomer}</Text>
          )}

          {selCust?.is_vip && (
            <View style={s.toggleRow}>
              <TouchableOpacity onPress={() => setVipOn(v => !v)} style={[s.toggle, { backgroundColor: vipOn ? '#550a19' : '#e0d8da' }]}>
                <View style={[s.toggleKnob, { left: vipOn ? 18 : 2 }]} />
              </TouchableOpacity>
              <Text style={s.toggleLabel}>{t.vipDisc} ({selCust.vip_discount_pct}%)</Text>
              <Text style={s.discAmt}>{vipOn ? `− ฿${fmt(vipAmt)}` : '—'}</Text>
            </View>
          )}
          <View style={s.extraRow}>
            <Text style={s.extraLabel}>{t.extraDisc}</Text>
            <TextInput
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
            [t.priceItem,  `฿${fmt(subtotal)}`,                   '#2c1015'],
            [t.priceVip,   vipAmt ? `− ฿${fmt(vipAmt)}` : '—',   '#2e7d32'],
            [t.priceExtra, `− ฿${fmt(parseFloat(extraDisc)||0)}`, '#2c1015'],
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
                  <TouchableOpacity key={label} onPress={() => setVatOn(val)}
                    style={[s.vatOption, { backgroundColor: vatOn === val ? '#550a19' : '#fff' }]}>
                    <Text style={[s.vatOptionText, { color: vatOn === val ? '#f5e0e5' : '#a07080' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={[s.priceRow, { borderTopWidth: 0.5, borderTopColor: '#e8c0c8', marginTop: 7, paddingTop: 7 }]}>
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
                <TouchableOpacity key={m.key} onPress={() => setSelPay(p => p.includes(m.key) ? p.filter(k => k !== m.key) : [...p, m.key])}
                  style={[s.payCard, { borderColor: on ? '#550a19' : '#e8d5d9', borderWidth: on ? 1.5 : 0.5, backgroundColor: on ? '#fdf0f2' : '#fff' }]}>
                  <MaterialCommunityIcons name={m.icon} size={18} color={on ? '#550a19' : '#2e7d32'} />
                  <Text style={[s.payCardLabel, { color: '#2c1015' }]}>{m.label}</Text>
                  {on && <MaterialCommunityIcons name="check" size={12} color="#550a19" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {(selPay.includes('cash') || selPay.includes('qr')) && (
            <View style={s.splitBox}>
              <Text style={s.splitTitle}>{t.splitTitle}</Text>
              {selPay.includes('cash') && (
                <View style={s.splitRow}>
                  <MaterialCommunityIcons name="cash" size={18} color="#2e7d32" />
                  <Text style={s.splitLabel}>{lang === 'th' ? 'เงินสด' : 'Cash'}</Text>
                  <TextInput style={s.splitInput} value={splitCash} onChangeText={setSplitCash} keyboardType="numeric" />
                </View>
              )}
              {selPay.includes('qr') && (
                <View style={s.splitRow}>
                  <MaterialCommunityIcons name="qrcode" size={18} color="#2e7d32" />
                  <Text style={s.splitLabel}>{lang === 'th' ? 'โอน / QR' : 'Transfer'}</Text>
                  <TextInput style={s.splitInput} value={splitQr !== null ? String(splitQr) : String(qrVal)} onChangeText={setSplitQr} keyboardType="numeric" />
                </View>
              )}
              <View style={[s.splitRow, { borderTopWidth: 0.5, borderTopColor: '#e8d5d9', paddingTop: 7, marginTop: 2 }]}>
                <Text style={s.splitLabel}>{t.remaining}</Text>
                <Text style={[s.splitInput, { textAlign: 'right', fontWeight: '600', color: remaining <= 0 ? '#2e7d32' : '#c62828', borderWidth: 0 }]}>
                  {remaining <= 0 ? `฿0 ${t.paid}` : `฿${fmt(remaining)}`}
                </Text>
              </View>
            </View>
          )}
        </Sec>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity onPress={handleConfirm} disabled={saving || cartItems.length === 0}
          style={[s.confirmBtn, { opacity: (saving || cartItems.length === 0) ? 0.6 : 1 }]}>
          {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={18} color="#fff5f7" />}
          <Text style={s.confirmBtnText}>{saving ? t.saving : t.confirmSale(fmt(grandTotal))}</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* STOCK PICKER MODAL */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t.fromStock}</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.modalSearch}
            value={pickerQuery}
            onChangeText={setPickerQuery}
            placeholder={t.searchItem}
            placeholderTextColor="#b08090"
            autoFocus
          />
          {loadingStock
            ? <ActivityIndicator style={{ marginTop: 20 }} color="#550a19" />
            : (
              <FlatList
                data={filteredStock}
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={<Text style={s.emptyText}>{t.noStock}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => addToCart(item)} style={s.stockRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.stockName}>{item.name}</Text>
                      <Text style={s.stockSku}>{item.sku} · {item.metal_type || '—'} · คงเหลือ {item.stock_qty}</Text>
                    </View>
                    <Text style={s.stockPrice}>฿{fmt(item.sale_price)}</Text>
                  </TouchableOpacity>
                )}
              />
            )
          }
        </View>
      </Modal>

      {/* CUSTOMER PICKER MODAL */}
      <Modal visible={showCustPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t.customer}</Text>
            <TouchableOpacity onPress={() => setShowCustPicker(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.modalSearch}
            value={custQuery}
            onChangeText={setCustQuery}
            placeholder={t.searchMember}
            placeholderTextColor="#b08090"
            autoFocus
          />
          <FlatList
            data={filteredCusts}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={<Text style={s.emptyText}>{lang === 'th' ? 'ไม่พบลูกค้า' : 'No customers'}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setSelCustId(item.id); setShowCustPicker(false); setCustQuery(''); }} style={s.stockRow}>
                <Text style={{ flex: 1, fontSize: 14, color: '#2c1015' }}>{item.full_name}</Text>
                {item.is_vip && <View style={s.vipBadge}><Text style={s.vipText}>VIP</Text></View>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 30 },
  errBox: { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#a32d2d' },
  okBox:  { backgroundColor: '#e8f5e9', borderWidth: 0.5, borderColor: '#a8d8b0', borderRadius: 8, padding: 10, marginBottom: 10 },
  okText: { fontSize: 12, color: '#1a5c28' },
  sec: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 12, marginBottom: 10 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  secHeadText: { fontSize: 11, fontWeight: '500', color: '#550a19', letterSpacing: 1.5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9f4f5', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10, marginBottom: 8 },
  searchPh: { fontSize: 13, color: '#b08090' },
  fromStockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8c0c8', padding: 10, marginBottom: 10 },
  fromStockText: { fontSize: 12, fontWeight: '500', color: '#550a19' },
  cartCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#550a19', padding: 12, marginBottom: 8 },
  cartName: { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  cartSku: { fontSize: 10, color: '#a07080', marginTop: 2 },
  cartPrice: { fontSize: 15, fontWeight: '500', color: '#550a19', marginTop: 4 },
  removeBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', justifyContent: 'center', alignItems: 'center' },
  certTag: { marginTop: 6, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  certTagText: { fontSize: 10, color: '#550a19' },
  emptyText: { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 10 },
  addMoreBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: '#e8c0c8', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addMoreText: { fontSize: 12, color: '#b08090' },
  custCard: { backgroundColor: '#fdf0f2', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  custAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#550a19', justifyContent: 'center', alignItems: 'center' },
  custAvatarText: { fontSize: 12, fontWeight: '500', color: '#f5e0e5' },
  custName: { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  custSub:  { fontSize: 11, color: '#a07080', marginTop: 1 },
  vipBadge: { backgroundColor: '#550a19', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  vipText:  { fontSize: 9, fontWeight: '500', color: '#f5e0e5' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  toggle: { width: 36, height: 20, borderRadius: 10, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleLabel: { fontSize: 12, color: '#550a19', fontWeight: '500', flex: 1 },
  discAmt: { fontSize: 13, fontWeight: '500', color: '#2e7d32' },
  extraRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f4f5', borderRadius: 8, padding: 8 },
  extraLabel: { fontSize: 11, color: '#a07080' },
  smallInput: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 7, padding: 5, fontSize: 13, fontWeight: '500', color: '#550a19', width: 80, textAlign: 'right' },
  priceSec: { backgroundColor: '#fdf5f7', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8c0c8', padding: 12, marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  priceLabel: { fontSize: 13, color: '#806070' },
  priceVal:   { fontSize: 13, fontWeight: '500' },
  grandLabel: { fontSize: 14, fontWeight: '500', color: '#550a19' },
  grandVal:   { fontSize: 20, fontWeight: '500', color: '#550a19' },
  vatToggle:  { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e8c0c8' },
  vatOption:  { paddingHorizontal: 11, paddingVertical: 4 },
  vatOptionText: { fontSize: 11, fontWeight: '500' },
  payHint: { fontSize: 11, color: '#a07080', marginBottom: 8 },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  payCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  payCardLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  splitBox: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10 },
  splitTitle: { fontSize: 11, color: '#a07080', marginBottom: 8 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  splitLabel: { fontSize: 12, color: '#806070', flex: 1 },
  splitInput: { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 7, padding: 6, fontSize: 13, fontWeight: '500', color: '#550a19', width: 90, textAlign: 'right' },
  confirmBtn: { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  confirmBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  modal: { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  modalSearch: { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, padding: 10, fontSize: 14, color: '#2c1015', marginBottom: 10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  stockName: { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  stockSku: { fontSize: 10, color: '#a07080' },
  stockPrice: { fontSize: 13, fontWeight: '500', color: '#550a19' },
});
