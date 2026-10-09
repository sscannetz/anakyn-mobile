// ══════════════════════════════════════════════════════
// PromptPayModal.jsx — หน้าจอ QR ให้ลูกค้าสแกนจ่าย
//
// ถามสถานะทุก 3 วิ เป็น "ตัวหลัก" ไม่ใช่ตัวสำรอง
//   - Omise บอกตรง ๆ ว่าไม่การันตี retry ของ webhook
//   - Render free tier หลับหลังไม่มี traffic ~15 นาที webhook อาจยิงไม่ถึง
// webhook จึงเป็นแค่ตัวเร่งให้รู้ผลเร็วขึ้นเฉย ๆ
// ══════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import ShellModal from './ShellModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api';
import { useScaledStyles } from '../responsive';

const T = {
  th: {
    title: 'สแกนจ่ายด้วย PromptPay',
    amount: 'ยอดที่ต้องชำระ',
    waiting: 'รอลูกค้าสแกนจ่าย...',
    timeLeft: 'เหลือเวลา',
    success: 'ชำระเงินเรียบร้อย',
    expired: 'QR หมดอายุแล้ว',
    failed: 'ชำระเงินไม่สำเร็จ',
    cancelledNote: 'บิลนี้ถูกยกเลิกและคืนสต๊อกให้แล้ว',
    hint: 'เปิดแอปธนาคาร → สแกน QR → ตรวจยอดให้ตรงก่อนกดจ่าย',
    close: 'ปิด',
    done: 'ออกใบเสร็จ',
    checking: 'กำลังตรวจสอบ...',
    pendingWarn: 'ปิดหน้าต่างนี้ได้ ระบบจะยังรอการชำระเงินต่อจนกว่า QR จะหมดอายุ',
  },
  en: {
    title: 'Scan to pay with PromptPay',
    amount: 'Amount due',
    waiting: 'Waiting for the customer to pay...',
    timeLeft: 'Time left',
    success: 'Payment received',
    expired: 'QR code expired',
    failed: 'Payment failed',
    cancelledNote: 'This sale was cancelled and the stock returned',
    hint: 'Open your banking app → scan → check the amount before paying',
    close: 'Close',
    done: 'Issue receipt',
    checking: 'Checking...',
    pendingWarn: 'You can close this — the system keeps waiting until the QR expires',
  },
};

const fmt = (n) => {
  const x = Number(n);
  return (Number.isFinite(x) ? x : 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PromptPayModal({ payment, lang = 'th', onPaid, onClose }) {
  const { styles: s, sc, t: th } = useScaledStyles(baseStyles);
  const t = T[lang] || T.th;

  const [status, setStatus] = useState(payment?.status || 'pending');
  const [left, setLeft]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const paidFired = useRef(false);

  // ── ถามสถานะทุก 3 วิ ──
  useEffect(() => {
    if (!payment?.id || status !== 'pending') return;
    let alive = true;

    const tick = async () => {
      try {
        const p = await api.getPayment(payment.id);
        if (!alive) return;
        if (p.status !== 'pending') setStatus(p.status);
      } catch (_) { /* เน็ตสะดุด → รอบหน้าค่อยถามใหม่ */ }
    };

    const timer = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, [payment?.id, status]);

  // ── นับถอยหลังหมดอายุ ──
  useEffect(() => {
    if (!payment?.expires_at || status !== 'pending') return;
    const tick = () => {
      const ms = new Date(payment.expires_at) - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [payment?.expires_at, status]);

  // ── จ่ายสำเร็จ → แจ้งหน้าแม่ครั้งเดียว ──
  useEffect(() => {
    if (status === 'successful' && !paidFired.current) {
      paidFired.current = true;
      onPaid?.(payment);
    }
  }, [status]);

  const mmss = left == null ? '' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const isPending = status === 'pending';
  const isOk      = status === 'successful';

  return (
    <ShellModal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.header}>
          <Text style={s.title}>{t.title}</Text>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={sc(22)} color={th.brand} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.amountLabel}>{t.amount}</Text>
          <Text style={s.amount}>฿{fmt(payment?.amount)}</Text>

          {isPending && (
            <>
              {payment?.qr_image_url ? (
                <Image source={{ uri: payment.qr_image_url }} style={s.qr} resizeMode="contain" />
              ) : (
                <View style={[s.qr, s.qrEmpty]}><ActivityIndicator color={th.brand} /></View>
              )}

              <View style={s.statusRow}>
                <ActivityIndicator size="small" color={th.warn} />
                <Text style={s.waiting}>{t.waiting}</Text>
              </View>

              {left != null && (
                <Text style={[s.timer, left <= 60 && { color: th.danger }]}>
                  {t.timeLeft} {mmss}
                </Text>
              )}

              <Text style={s.hint}>{t.hint}</Text>
              <Text style={s.pendingWarn}>{t.pendingWarn}</Text>
            </>
          )}

          {isOk && (
            <View style={s.resultBox}>
              <MaterialCommunityIcons name="check-circle" size={sc(56)} color={th.ok} />
              <Text style={[s.resultText, { color: th.ok }]}>{t.success}</Text>
            </View>
          )}

          {(status === 'expired' || status === 'failed') && (
            <View style={s.resultBox}>
              <MaterialCommunityIcons name="close-circle" size={sc(56)} color={th.danger} />
              <Text style={[s.resultText, { color: th.danger }]}>
                {status === 'expired' ? t.expired : t.failed}
              </Text>
              <Text style={s.cancelledNote}>{t.cancelledNote}</Text>
              {!!payment?.failure_code && <Text style={s.failCode}>{payment.failure_code}</Text>}
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onClose} disabled={busy}
            style={[s.btn, isOk ? s.btnPrimary : s.btnPlain]}>
            {busy
              ? <ActivityIndicator size="small" color={isOk ? th.brandOn : th.brand} />
              : <Text style={[s.btnText, isOk && { color: th.brandOn }]}>{isOk ? t.done : t.close}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ShellModal>
  );
}

const baseStyles = (th) => ({
  wrap:   { flex: 1, backgroundColor: th.card2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: th.card, borderBottomWidth: 0.5, borderBottomColor: th.line2, paddingHorizontal: 16, paddingVertical: 14 },
  title:  { flex: 1, fontSize: 16, fontWeight: '500', color: th.brand },
  body:   { padding: 18, alignItems: 'center' },
  amountLabel: { fontSize: 11, color: th.muted2 },
  amount: { fontSize: 30, fontWeight: '600', color: th.brand, marginTop: 2, marginBottom: 16 },
  qr:     { width: 250, height: 250, backgroundColor: th.card, borderRadius: 12, borderWidth: 0.5, borderColor: th.line2 },
  qrEmpty:{ justifyContent: 'center', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  waiting:{ fontSize: 13, color: th.warn },
  timer:  { fontSize: 13, fontWeight: '600', color: th.warn, marginTop: 6 },
  hint:   { fontSize: 11, color: th.muted2, textAlign: 'center', marginTop: 14, lineHeight: 17 },
  pendingWarn: { fontSize: 10.5, color: th.dim, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  resultBox: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  resultText: { fontSize: 17, fontWeight: '600' },
  cancelledNote: { fontSize: 11.5, color: th.muted2, textAlign: 'center' },
  failCode: { fontSize: 10, color: th.dim },
  footer: { borderTopWidth: 0.5, borderTopColor: th.line2, backgroundColor: th.card, padding: 14 },
  btn:    { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnPlain:   { backgroundColor: th.card, borderWidth: 1, borderColor: th.line3 },
  btnPrimary: { backgroundColor: th.brandBg },
  btnText: { fontSize: 14, fontWeight: '600', color: th.brand },
});
