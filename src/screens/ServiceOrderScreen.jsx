// ══════════════════════════════════════════════════════
// ServiceOrderScreen.jsx — React Native
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { api } from '../api';
import { printServiceOrder } from '../print';
import { DocWrapper, DocHeader, Parties, Sec, SL, ItemHead, ItemRow, InfoRow, GrandTotal, DocFooter, fmtBaht } from '../components/DocLayout';

const STATUS_STYLE = {
  received:  { bg: '#fff8e1', col: '#854F0B' },
  repairing: { bg: '#e0f0ff', col: '#1a3a60' },
  qc:        { bg: '#f0eeff', col: '#3c3489' },
  notified:  { bg: '#fdf0f2', col: '#7a1c2e' },
  picked_up: { bg: '#e8f5e9', col: '#1a5c28' },
};

const STATUS_LABELS = {
  th: { received: 'รับเรื่อง', repairing: 'กำลังซ่อม', qc: 'ตรวจสอบ', notified: 'แจ้งลูกค้า', picked_up: 'รับคืนแล้ว' },
  en: { received: 'Received', repairing: 'Repairing', qc: 'QC', notified: 'Notified', picked_up: 'Picked up' },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

export default function ServiceOrderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang]     = useState('th');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selSO, setSelSO]   = useState(null);
  const [custName, setCustName]   = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [prodName, setProdName]   = useState('');
  const [issue, setIssue]         = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [dueDate, setDueDate]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const slabs = STATUS_LABELS[lang];

  useEffect(() => {
    api.getServiceOrders().then(setOrders).finally(() => setLoading(false));
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!custName.trim() || !prodName.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกชื่อลูกค้าและสินค้า' : 'Please fill customer and product');
      return;
    }
    setSaving(true); setError('');
    try {
      const so = await api.createServiceOrder({
        customer_name: custName, customer_phone: custPhone,
        product_name: prodName, issue_description: issue,
        estimated_cost: parseFloat(estimatedCost) || 0,
        expected_completion_date: dueDate || null,
      });
      setOrders(prev => [so, ...prev]);
      setShowNew(false);
      setCustName(''); setCustPhone(''); setProdName(''); setIssue(''); setEstimatedCost(''); setDueDate('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateServiceStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      if (selSO?.id === id) setSelSO(prev => ({ ...prev, status }));
    } catch (_) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={lang === 'th' ? 'ใบสั่งซ่อม' : 'Service Order'} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')}
        rightComponent={
          <TouchableOpacity onPress={() => setShowNew(true)} style={s.iconBtn}>
            <MaterialCommunityIcons name="plus" size={16} color="#f5e0e5" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={s.content}>
        {loading && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!loading && orders.length === 0 && <Text style={s.emptyText}>{lang === 'th' ? 'ยังไม่มีใบสั่งซ่อม' : 'No service orders yet'}</Text>}
        {orders.map(o => {
          const st = STATUS_STYLE[o.status] || STATUS_STYLE.received;
          return (
            <TouchableOpacity key={o.id} onPress={() => setSelSO(o)} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNo}>{o.service_no}</Text>
                <Text style={s.cardTitle}>{o.product_name || '—'}</Text>
                <Text style={s.cardSub}>{o.customer_name || 'ไม่ระบุ'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {o.estimated_cost > 0 && <Text style={s.cardAmt}>฿{fmt(o.estimated_cost)}</Text>}
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.col }]}>{slabs[o.status] || o.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* NEW SO MODAL */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'รับงานซ่อมใหม่' : 'New Service Order'}</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!!error && <View style={s.errBox}><Text style={s.errText}>{error}</Text></View>}
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ชื่อลูกค้า' : 'Customer Name'}</Text>
            <TextInput style={s.input} value={custName} onChangeText={setCustName} placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</Text>
            <TextInput style={s.input} value={custPhone} onChangeText={setCustPhone} keyboardType="phone-pad" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ชื่อสินค้าที่นำมาซ่อม' : 'Product Name'}</Text>
            <TextInput style={s.input} value={prodName} onChangeText={setProdName} placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'อาการเสีย / ปัญหา' : 'Issue Description'}</Text>
            <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={issue} onChangeText={setIssue} multiline placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'ค่าซ่อมประมาณ (บาท)' : 'Estimated Cost (THB)'}</Text>
            <TextInput style={s.input} value={estimatedCost} onChangeText={setEstimatedCost} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
            <Text style={s.fieldLabel}>{lang === 'th' ? 'วันนัดรับ (YYYY-MM-DD)' : 'Due Date (YYYY-MM-DD)'}</Text>
            <TextInput style={s.input} value={dueDate} onChangeText={setDueDate} placeholder="2026-01-31" placeholderTextColor="#c0a0a8" />
            <TouchableOpacity onPress={handleCreate} disabled={saving} style={[s.createBtn, { opacity: saving ? 0.7 : 1, marginTop: 8 }]}>
              {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={18} color="#fff5f7" />}
              <Text style={s.createBtnText}>{saving ? 'กำลังบันทึก...' : (lang === 'th' ? 'รับงาน' : 'Accept Job')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selSO} animationType="slide" presentationStyle="pageSheet">
        {selSO && (
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selSO.service_no}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={() => printServiceOrder(selSO)}>
                  <MaterialCommunityIcons name="printer" size={22} color="#550a19" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelSO(null)}>
                  <MaterialCommunityIcons name="close" size={22} color="#550a19" />
                </TouchableOpacity>
              </View>
            </View>
            <DocWrapper>
              <DocHeader badge={lang === 'th' ? 'ใบสั่งซ่อม' : 'SERVICE ORDER'} docNo={selSO.service_no}
                meta={[
                  ['วันที่รับ', new Date(selSO.received_at || selSO.created_at).toLocaleDateString('th-TH')],
                  ['นัดรับ', selSO.pickup_date ? new Date(selSO.pickup_date).toLocaleDateString('th-TH') : '—'],
                  ['สถานะ', slabs[selSO.status] || selSO.status || '—'],
                ]} />
              <Parties
                buyer={{ label: lang === 'th' ? 'ลูกค้า' : 'CUSTOMER', name: selSO.customer_name || 'ไม่ระบุ', sub: selSO.customer_phone || '—' }}
              />
              <Sec>
                <InfoRow label={lang === 'th' ? 'สินค้าที่ซ่อม' : 'Item'} value={selSO.product_name} />
                {!!selSO.issue_description && <InfoRow label={lang === 'th' ? 'อาการ / ปัญหา' : 'Issue'} value={selSO.issue_description} />}
              </Sec>
              <Sec>
                <SL>{lang === 'th' ? 'รายการซ่อม / บริการ' : 'SERVICES'}</SL>
                <ItemHead cols={['รายการ', '', 'ค่าบริการ']} />
                {(selSO.services || []).map((sv, i) => (
                  <ItemRow key={i} name={sv.name || `บริการที่ ${i + 1}`}
                    price={sv.is_warranty ? 0 : sv.price}
                    sub={sv.is_warranty ? (lang === 'th' ? 'ประกัน (ฟรี)' : 'Warranty') : null} />
                ))}
                {(selSO.services || []).length === 0 && <Text style={{ fontSize: 11, color: '#a07080' }}>— ไม่มีรายการ —</Text>}
              </Sec>
              <GrandTotal label={lang === 'th' ? 'ค่าซ่อมรวม' : 'Total'} value={fmtBaht(selSO.total_cost ?? selSO.estimated_cost)} />
              <DocFooter>ใบสั่งซ่อม · Anakyn Gems Co., Ltd.</DocFooter>
            </DocWrapper>

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>{lang === 'th' ? 'อัปเดตสถานะ' : 'Update status'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {['received','repairing','qc','notified','picked_up'].map(st => {
                const stStyle = STATUS_STYLE[st];
                return (
                  <TouchableOpacity key={st} onPress={() => handleUpdateStatus(selSO.id, st)}
                    style={[s.stBtn, { backgroundColor: selSO.status === st ? stStyle.col : stStyle.bg, borderColor: stStyle.col }]}>
                    <Text style={[s.stBtnText, { color: selSO.status === st ? '#fff' : stStyle.col }]}>{slabs[st]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  content:    { padding: 14, paddingBottom: 30 },
  emptyText:  { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 20 },
  card:       { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 10, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  cardNo:     { fontSize: 10, fontWeight: '500', color: '#550a19', marginBottom: 1 },
  cardTitle:  { fontSize: 13, fontWeight: '500', color: '#2c1015' },
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
  input:      { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, padding: 9, fontSize: 13, color: '#2c1015', marginBottom: 10 },
  createBtn:  { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  createBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  stBtn:      { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stBtnText:  { fontSize: 12, fontWeight: '500' },
});
