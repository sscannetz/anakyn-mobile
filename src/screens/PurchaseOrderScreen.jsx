// ══════════════════════════════════════════════════════
// PurchaseOrderScreen.jsx — React Native
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printPO, savePO } from '../print';
import { DocWrapper, DocHeader, Parties, Sec, SL, ItemHead, ItemRow, TRow, VatRow, GrandTotal, DocFooter, DocActions, fmtBaht } from '../components/DocLayout';

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

// ป้ายสถานะ: ใบที่ของยังไม่เข้า = แดงอ่อน · ใบที่จบแล้ว = ขาวเส้นบาง
const STATUS_STYLE = {
  pending:   { bg: '#fdf0f2', col: '#8c1b2f' },
  sent:      { bg: '#fdf0f2', col: '#8c1b2f' },
  received:  { bg: '#ffffff', col: '#9b7d86' },
  cancelled: { bg: '#ffffff', col: '#c0a8ae' },
};

const STATUS_LABELS = {
  th: { pending: 'รอส่ง', sent: 'ส่งแล้ว', received: 'รับแล้ว', cancelled: 'ยกเลิก' },
  en: { pending: 'Pending', sent: 'Sent', received: 'Received', cancelled: 'Cancelled' },
};

export default function PurchaseOrderScreen({ navigation }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang]       = useState('th');
  const [orders, setOrders]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selPO, setSelPO]     = useState(null);
  const [dVatOn, setDVatOn]   = useState(true);
  const [dVatRate, setDVatRate] = useState('7');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [items, setItems]     = useState([{ name: '', qty: '1', price: '' }]);
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const slabs = STATUS_LABELS[lang];

  useEffect(() => {
    api.getPurchaseOrders().then(setOrders).finally(() => setLoading(false));
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const total = items.reduce((s, it) => s + (parseFloat(it.qty)||0) * (parseFloat(it.price)||0), 0);
  const updItem = (idx, k, v) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));

  const handleCreate = async () => {
    if (!supName.trim() || items[0].name.trim() === '') {
      setError(lang === 'th' ? 'กรุณากรอกชื่อ supplier และสินค้า' : 'Please fill supplier and items');
      return;
    }
    setSaving(true); setError('');
    try {
      const po = await api.createPurchaseOrder({
        supplier_name: supName, supplier_phone: supPhone,
        items: items.filter(it => it.name.trim()).map(it => ({ name: it.name, qty: parseInt(it.qty)||1, unit_price: parseFloat(it.price)||0 })),
        notes,
      });
      setOrders(prev => [po, ...prev]);
      setShowNew(false);
      setSupName(''); setSupPhone(''); setItems([{ name: '', qty: '1', price: '' }]); setNotes('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updatePOStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      if (selPO?.id === id) setSelPO(prev => ({ ...prev, status }));
    } catch (_) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบสั่งซื้อ' : 'Purchase Order'} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />
      <ConnectingBar visible={loading} lang={lang} />

      {/* แถวเครื่องมือ — จำนวนรายการ และปุ่มสร้างใหม่ (ย้ายมาจากมุมแถบบน) */}
      <View style={s.toolbar}>
        <Text style={s.toolbarCount}>
          {orders.length} {lang === 'th' ? 'ใบ' : 'orders'}
        </Text>
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowNew(true)} style={s.primaryBtn}>
          <MaterialCommunityIcons name="plus" size={sc(15)} color="#fff5f7" />
          <Text style={s.primaryBtnText}>{lang === 'th' ? 'สร้างใบสั่งซื้อ' : 'New order'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && orders.length === 0 && <Text style={s.emptyText}>{lang === 'th' ? 'ยังไม่มีใบสั่งซื้อ' : 'No purchase orders yet'}</Text>}
        {orders.map(o => {
          const st = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
          return (
            <TouchableOpacity dataSet={{ hov: 'btn' }} key={o.id} onPress={() => {
                const b = Number(o.subtotal) || 0;
                setDVatOn(Number(o.vat_amount) > 0 || o.vat_applied === true);
                setDVatRate(b > 0 && Number(o.vat_amount) > 0 ? String(Math.round(Number(o.vat_amount) / b * 100)) : '7');
                setSelPO(o);
                api.getPurchaseOrder(o.id).then(full => setSelPO(prev => prev && prev.id === o.id ? { ...prev, ...full } : prev)).catch(() => {});
              }} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNo}>{o.po_no}</Text>
                <Text style={s.cardSub}>{o.supplier_name || 'ไม่ระบุ'} · {new Date(o.created_at).toLocaleDateString('th-TH')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.cardAmt}>฿{fmt(o.total)}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.col }]}>{slabs[o.status] || o.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW PO MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'สร้างใบสั่งซื้อ' : 'Create Purchase Order'}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ชื่อ Supplier' : 'Supplier Name'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={supName} onChangeText={setSupName} placeholder={lang === 'th' ? 'เช่น บริษัท XYZ จำกัด' : 'e.g. XYZ Co., Ltd.'} placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={s.input} value={supPhone} onChangeText={setSupPhone} keyboardType="phone-pad" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'รายการสินค้า' : 'Items'}</Text>
            {items.map((it, idx) => (
              <View key={idx} style={s.itemRow}>
                <TextInput dataSet={{ hov: 'field' }} style={[s.input, { flex: 2, marginBottom: 0 }]} value={it.name} onChangeText={v => updItem(idx, 'name', v)} placeholder={lang === 'th' ? 'ชื่อสินค้า' : 'Item name'} placeholderTextColor="#c0a0a8" />
                <TextInput dataSet={{ hov: 'field' }} style={[s.input, { width: 50, marginBottom: 0 }]} value={it.qty} onChangeText={v => updItem(idx, 'qty', v)} keyboardType="numeric" />
                <TextInput dataSet={{ hov: 'field' }} style={[s.input, { flex: 1, marginBottom: 0 }]} value={it.price} onChangeText={v => updItem(idx, 'price', v)} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
                {items.length > 1 && (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                    <MaterialCommunityIcons name="close" size={sc(18)} color="#550a19" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setItems(prev => [...prev, { name: '', qty: '1', price: '' }])} style={s.addItemBtn}>
              <MaterialCommunityIcons name="plus" size={sc(14)} color="#550a19" />
              <Text style={s.addItemText}>{lang === 'th' ? 'เพิ่มรายการ' : 'Add item'}</Text>
            </TouchableOpacity>
            <View style={[s.totalRow, { marginVertical: 8 }]}>
              <Text style={s.totalLabel}>{lang === 'th' ? 'ยอดรวม' : 'Total'}</Text>
              <Text style={[s.totalVal, { fontSize: 18, color: '#550a19' }]}>฿{fmt(total)}</Text>
            </View>
            <Text style={s.fieldLabel}>{lang === 'th' ? 'หมายเหตุ' : 'Notes'}</Text>
            <TextInput dataSet={{ hov: 'field' }} style={[s.input, { height: 70, textAlignVertical: 'top', marginBottom: 16 }]} value={notes} onChangeText={setNotes} multiline placeholderTextColor="#c0a0a8" />
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleCreate} disabled={saving} style={[s.createBtn, { opacity: saving ? 0.7 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={sc(18)} color="#fff5f7" />}
              <Text style={s.createBtnText}>{saving ? 'กำลังบันทึก...' : (lang === 'th' ? 'สร้าง PO' : 'Create PO')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selPO} animationType="slide" presentationStyle="pageSheet">
        {selPO && (
          <ScrollView style={s.modal} contentContainerStyle={{ paddingTop: 16, paddingBottom: 30 }}>
            {(() => {
              const base = Number(selPO.subtotal ?? selPO.total) || 0;
              const rate = parseFloat(dVatRate) || 0;
              const vatAmt = dVatOn ? Math.round(base * rate / 100) : 0;
              const grand = base + vatAmt;
              const docObj = { ...selPO, subtotal: base, vat_amount: vatAmt, total: grand, vat_applied: dVatOn, vat_rate: rate };
              return (
                <>
                  <DocWrapper>
                    <DocHeader badge={lang === 'th' ? 'ใบสั่งซื้อ' : 'PURCHASE ORDER'} docNo={selPO.po_no}
                      meta={[
                        ['วันที่', new Date(selPO.created_at).toLocaleDateString('th-TH')],
                        ['ต้องการภายใน', selPO.needed_by ? new Date(selPO.needed_by).toLocaleDateString('th-TH') : '—'],
                        ['VAT', dVatOn ? `${rate}%` : 'ไม่มี'],
                      ]} />
                    <Parties
                      seller={{ label: lang === 'th' ? 'ผู้ขาย (ซัพพลายเออร์)' : 'SUPPLIER', name: selPO.supplier_name || 'ไม่ระบุ', sub: selPO.phone || '—' }}
                      buyer={{ label: lang === 'th' ? 'ผู้สั่งซื้อ' : 'BUYER', name: 'Anakyn Gems Co., Ltd.', sub: '123 ถ.สีลม กรุงเทพฯ 10500' }}
                    />
                    <Sec>
                      <SL>{lang === 'th' ? 'รายการสั่งซื้อ' : 'ITEMS'}</SL>
                      <ItemHead cols={['รายการ', 'จำนวน', 'รวม']} />
                      {(selPO.items || []).map((it, i) => (
                        <ItemRow key={i} name={it.item_name || it.name || `รายการที่ ${i + 1}`}
                          sub={it.unit ? `${Number(it.qty) || 0} ${it.unit} × ${fmtBaht(it.unit_price ?? it.price)}` : null}
                          qty={Number(it.qty) || 0}
                          price={it.line_total ?? ((Number(it.qty) || 0) * Number(it.unit_price ?? it.price ?? 0))} />
                      ))}
                      {(selPO.items || []).length === 0 && <Text style={{ fontSize: 11, color: '#a07080' }}>— ไม่มีรายการ —</Text>}
                    </Sec>
                    <Sec>
                      <TRow label={lang === 'th' ? 'มูลค่าก่อน VAT' : 'Subtotal'} value={fmtBaht(base)} />
                      <VatRow enabled={dVatOn} rate={dVatRate} amount={vatAmt} onToggle={setDVatOn} onRate={setDVatRate} lang={lang} />
                    </Sec>
                    <GrandTotal label={lang === 'th' ? 'ยอดรวมทั้งสิ้น' : 'Grand Total'} value={fmtBaht(grand)} />
                    <DocFooter>เอกสารสั่งซื้อ · Anakyn Gems Co., Ltd.</DocFooter>
                  </DocWrapper>
                  <Text style={[s.fieldLabel, { marginTop: 16 }]}>{lang === 'th' ? 'อัปเดตสถานะ' : 'Update status'}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {['pending','sent','received','cancelled'].map(st => {
                      const stStyle = STATUS_STYLE[st];
                      return (
                        <TouchableOpacity dataSet={{ hov: 'btn' }} key={st} onPress={() => handleUpdateStatus(selPO.id, st)}
                          style={[s.stBtn, { backgroundColor: selPO.status === st ? stStyle.col : stStyle.bg, borderColor: stStyle.col }]}>
                          <Text style={[s.stBtnText, { color: selPO.status === st ? '#fff' : stStyle.col }]}>{slabs[st]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <DocActions lang={lang} onPrint={() => printPO(docObj)} onSavePdf={() => savePO(docObj)} onBack={() => setSelPO(null)} />
                </>
              );
            })()}
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const baseStyles = {
  toolbar:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  toolbarCount: { flex: 1, fontSize: 12, color: '#9b7d86' },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#550a19', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  primaryBtnText: { fontSize: 12.5, fontWeight: '600', color: '#fff5f7' },
  content:    { padding: 14, paddingBottom: 30 },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardNo:     { fontSize: 12, fontWeight: '500', color: '#550a19' },
  cardSub:    { fontSize: 11, color: '#a07080', marginTop: 2 },
  cardAmt:    { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  badge:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2.5, borderWidth: 1, borderColor: '#ece0e3' },
  badgeText:  { fontSize: 9, fontWeight: '500' },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:     { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, padding: 9, fontSize: 13, color: '#2c1015', marginBottom: 10 },
  itemRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 10, padding: 10, marginBottom: 8 },
  addItemText:{ fontSize: 12, fontWeight: '500', color: '#550a19' },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 12, color: '#806070', fontWeight: '500' },
  totalVal:   { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  createBtn:  { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  createBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  stBtn:      { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stBtnText:  { fontSize: 12, fontWeight: '500' },
};
