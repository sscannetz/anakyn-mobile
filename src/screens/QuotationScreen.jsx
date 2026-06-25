// ══════════════════════════════════════════════════════
// QuotationScreen.jsx — React Native version of AnakynQuotation
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

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

const STATUS_STYLE = {
  draft:    { bg: '#f5f5f5', col: '#666' },
  sent:     { bg: '#e0f0ff', col: '#1a3a60' },
  accepted: { bg: '#e8f5e9', col: '#1a5c28' },
  rejected: { bg: '#fdf0f2', col: '#7a1c2e' },
  expired:  { bg: '#fff8e1', col: '#854F0B' },
};

const STATUS_LABELS = {
  th: { draft: 'Draft', sent: 'ส่งแล้ว', accepted: 'อนุมัติ', rejected: 'ปฏิเสธ', expired: 'หมดอายุ' },
  en: { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired' },
};

export default function QuotationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [products, setProducts]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [selProds, setSelProds]     = useState([]);
  const [selCustId, setSelCustId]   = useState(null);
  const [notes, setNotes]           = useState('');
  const [vatOn, setVatOn]           = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [selQt, setSelQt]           = useState(null);
  const [showProdPicker, setShowProdPicker] = useState(false);
  const [prodQuery, setProdQuery]   = useState('');

  const slabs = STATUS_LABELS[lang];

  useEffect(() => {
    api.getQuotations().then(setQuotations).finally(() => setLoading(false));
    api.getProducts().then(setProducts).catch(() => {});
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const filteredProds = products.filter(p => !prodQuery || p.name.toLowerCase().includes(prodQuery.toLowerCase()) || p.sku.toLowerCase().includes(prodQuery.toLowerCase()));

  const subtotal  = selProds.reduce((s, sp) => s + Number(sp.price), 0);
  const vatAmt    = vatOn ? Math.round(subtotal * 0.07) : 0;
  const total     = subtotal + vatAmt;

  const handleCreate = async () => {
    if (selProds.length === 0) { setError(lang === 'th' ? 'กรุณาเลือกสินค้า' : 'Please select items'); return; }
    setSaving(true); setError('');
    try {
      const qt = await api.createQuotation({
        customer_id: selCustId,
        items: selProds.map(sp => ({ product_id: sp.id, qty: 1, unit_price: sp.price })),
        vat_enabled: vatOn,
        notes,
      });
      setQuotations(prev => [qt, ...prev]);
      setShowNew(false); setSelProds([]); setNotes(''); setSelCustId(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateQuotationStatus(id, status);
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      if (selQt?.id === id) setSelQt(prev => ({ ...prev, status }));
    } catch (_) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบเสนอราคา' : 'Quotation'} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')}
        rightComponent={
          <TouchableOpacity onPress={() => setShowNew(true)} style={s.iconBtn}>
            <MaterialCommunityIcons name="plus" size={16} color="#f5e0e5" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={s.content}>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && quotations.length === 0 && <Text style={s.emptyText}>{lang === 'th' ? 'ยังไม่มีใบเสนอราคา' : 'No quotations yet'}</Text>}
        {quotations.map(qt => {
          const st = STATUS_STYLE[qt.status] || STATUS_STYLE.draft;
          return (
            <TouchableOpacity key={qt.id} onPress={() => setSelQt(qt)} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNo}>{qt.quotation_no}</Text>
                <Text style={s.cardSub}>{qt.customer_name || 'ไม่ระบุ'} · {new Date(qt.created_at || qt.issued_at).toLocaleDateString('th-TH')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.cardAmt}>฿{fmt(qt.grand_total)}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.col }]}>{slabs[qt.status] || qt.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW QT MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'ออกใบเสนอราคาใหม่' : 'New Quotation'}</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ลูกค้า' : 'Customer'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setSelCustId(null)} style={[s.chip, { backgroundColor: !selCustId ? '#550a19' : '#f9f4f5', borderColor: !selCustId ? '#550a19' : '#e8d5d9' }]}>
                  <Text style={[s.chipText, { color: !selCustId ? '#fff' : '#a07080' }]}>{lang === 'th' ? 'ไม่ระบุ' : 'None'}</Text>
                </TouchableOpacity>
                {customers.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setSelCustId(c.id)} style={[s.chip, { backgroundColor: selCustId === c.id ? '#550a19' : '#f9f4f5', borderColor: selCustId === c.id ? '#550a19' : '#e8d5d9' }]}>
                    <Text style={[s.chipText, { color: selCustId === c.id ? '#fff' : '#a07080' }]}>{c.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={s.fieldLabel}>{lang === 'th' ? 'สินค้า' : 'Items'}</Text>
            <TouchableOpacity onPress={() => setShowProdPicker(true)} style={s.addItemBtn}>
              <MaterialCommunityIcons name="plus" size={16} color="#550a19" />
              <Text style={s.addItemText}>{lang === 'th' ? 'เพิ่มสินค้า' : 'Add item'}</Text>
            </TouchableOpacity>
            {selProds.map((sp, i) => (
              <View key={i} style={s.selectedProd}>
                <Text style={[s.cardNo, { flex: 1 }]}>{sp.name}</Text>
                <Text style={s.cardAmt}>฿{fmt(sp.price)}</Text>
                <TouchableOpacity onPress={() => setSelProds(prev => prev.filter((_, idx) => idx !== i))} style={{ marginLeft: 8 }}>
                  <MaterialCommunityIcons name="close" size={14} color="#550a19" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={s.vatRow}>
              {[['VAT 7%', true],['ไม่มี VAT', false]].map(([l, v]) => (
                <TouchableOpacity key={l} onPress={() => setVatOn(v)} style={[s.vatBtn, { backgroundColor: vatOn === v ? '#550a19' : '#f9f4f5', borderColor: vatOn === v ? '#550a19' : '#e8d5d9' }]}>
                  <Text style={[s.vatBtnText, { color: vatOn === v ? '#f5e0e5' : '#a07080' }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.totalBox}>
              {[[lang === 'th' ? 'รวม' : 'Subtotal', subtotal], ['VAT 7%', vatAmt]].map(([l, v]) => (
                <View key={l} style={s.totalRow}><Text style={s.totalLabel}>{l}</Text><Text style={s.totalVal}>฿{fmt(v)}</Text></View>
              ))}
              <View style={[s.totalRow, { borderTopWidth: 0.5, borderTopColor: '#e8c0c8', marginTop: 6, paddingTop: 6 }]}>
                <Text style={[s.totalLabel, { fontWeight: '600', color: '#550a19' }]}>{lang === 'th' ? 'ยอดรวม' : 'Total'}</Text>
                <Text style={[s.totalVal, { fontSize: 18, color: '#550a19' }]}>฿{fmt(total)}</Text>
              </View>
            </View>
            <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes}
              placeholder={lang === 'th' ? 'หมายเหตุ...' : 'Notes...'} placeholderTextColor="#c0a0a8" multiline />
            <TouchableOpacity onPress={handleCreate} disabled={saving} style={[s.createBtn, { opacity: saving ? 0.7 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={18} color="#fff5f7" />}
              <Text style={s.createBtnText}>{saving ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'สร้างใบเสนอราคา' : 'Create Quotation')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* PRODUCT PICKER */}
      <Modal visible={showProdPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'เลือกสินค้า' : 'Select Product'}</Text>
            <TouchableOpacity onPress={() => setShowProdPicker(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          <TextInput style={s.searchInput} value={prodQuery} onChangeText={setProdQuery} placeholder="ค้นหา..." placeholderTextColor="#b08090" autoFocus />
          <FlatList
            data={filteredProds}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setSelProds(prev => [...prev, { id: item.id, name: item.name, price: Number(item.sale_price) }]); setShowProdPicker(false); setProdQuery(''); }}
                style={s.prodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNo}>{item.name}</Text>
                  <Text style={s.cardSub}>{item.sku}</Text>
                </View>
                <Text style={s.cardAmt}>฿{fmt(item.sale_price)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selQt} animationType="slide" presentationStyle="pageSheet">
        {selQt && (
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selQt.quotation_no}</Text>
              <TouchableOpacity onPress={() => setSelQt(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#550a19" />
              </TouchableOpacity>
            </View>
            <Text style={s.cardSub}>{selQt.customer_name || 'ไม่ระบุ'}</Text>
            <Text style={[s.cardAmt, { fontSize: 20, color: '#550a19', marginVertical: 8 }]}>฿{fmt(selQt.grand_total)}</Text>
            <Text style={s.fieldLabel}>{lang === 'th' ? 'อัปเดตสถานะ' : 'Update status'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {['draft','sent','accepted','rejected','expired'].map(st => {
                const stStyle = STATUS_STYLE[st] || STATUS_STYLE.draft;
                return (
                  <TouchableOpacity key={st} onPress={() => handleUpdateStatus(selQt.id, st)}
                    style={[s.stBtn, { backgroundColor: selQt.status === st ? stStyle.col : stStyle.bg, borderColor: stStyle.col }]}>
                    <Text style={[s.stBtnText, { color: selQt.status === st ? '#fff' : stStyle.col }]}>{slabs[st]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  content:    { padding: 14, paddingBottom: 30 },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  cardNo:     { fontSize: 12, fontWeight: '500', color: '#550a19' },
  cardSub:    { fontSize: 11, color: '#a07080', marginTop: 2 },
  cardAmt:    { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  badge:      { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:  { fontSize: 9, fontWeight: '500' },
  iconBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modal:      { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  errBox:     { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 12 },
  errText:    { fontSize: 12, color: '#a32d2d' },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 4 },
  chip:       { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:   { fontSize: 12 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 10, padding: 10, marginBottom: 8 },
  addItemText:{ fontSize: 12, fontWeight: '500', color: '#550a19' },
  selectedProd: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f4f5', borderRadius: 8, padding: 8, marginBottom: 6 },
  vatRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  vatBtn:     { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  vatBtnText: { fontSize: 12, fontWeight: '500' },
  totalBox:   { backgroundColor: '#fdf5f7', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8c0c8', padding: 12, marginBottom: 12 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 12, color: '#806070' },
  totalVal:   { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, padding: 10, fontSize: 14, color: '#2c1015', marginBottom: 12 },
  createBtn:  { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  createBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  searchInput:{ backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, padding: 10, fontSize: 14, color: '#2c1015', marginBottom: 10 },
  prodRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  stBtn:      { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stBtnText:  { fontSize: 12, fontWeight: '500' },
});
