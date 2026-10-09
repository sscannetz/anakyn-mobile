// ══════════════════════════════════════════════════════════════
// SelectInput.jsx — ช่องเลือกตัวเลือกแบบ dropdown ปกติ
//
// บนเว็บใช้ <select> ของเบราว์เซอร์ตรง ๆ
//   · กดแล้วรายการกางลงมาตรงช่อง ไม่เปิดหน้าต่างใหม่
//   · หน้าไม่เลื่อนกลับขึ้นบนหลังเลือกเสร็จ (ปัญหาเดิมของ popup)
//   · พิมพ์ตัวอักษรแรกเพื่อกระโดดหาตัวเลือกได้ เหมือน dropdown ทั่วไป
// แนวคิดเดียวกับ DateInput.jsx — react-native-web วิ่งบน React DOM
// อยู่แล้ว เลย createElement('select') ได้เลย ไม่ต้องลงไลบรารีเพิ่ม
//
// บนมือถือ (Expo native) ไม่มี <select> จึงถอยไปใช้แผ่นรายการเลื่อนขึ้น
// ซึ่งเป็นวิธีมาตรฐานของ iOS/Android อยู่แล้ว
//
// options รับได้ 2 แบบ — ['Round', 'Princess'] หรือ [{ value, label }]
// ══════════════════════════════════════════════════════════════
import { createElement, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

const norm = (o) => (typeof o === 'object' && o !== null ? o : { value: o, label: String(o) });

export default function SelectInput({
  value,
  onChange,
  options = [],
  placeholder = 'เลือก...',
  title,                 // หัวข้อของแผ่นรายการบนมือถือ
  clearLabel,            // ใส่ข้อความถ้าต้องการให้มีตัวเลือก "ล้างค่า"
  css = {},              // สไตล์เพิ่มเติมของ <select> บนเว็บ
  style,                 // สไตล์ของปุ่มบนมือถือ
  disabled = false,
}) {
  const { t: th } = useTheme();
  const n = maken(th);

  const list = options.map(norm);
  const cur  = value == null ? '' : String(value);

  if (Platform.OS === 'web') {
    return createElement(
      'select',
      {
        value: cur,
        disabled,
        onChange: (e) => onChange(e.target.value),
        'data-hov': 'field',
        style: {
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: th.card,
          border: '1px solid #ece0e3',
          borderRadius: 10,
          padding: '9px 12px',
          fontSize: 14,
          lineHeight: '20px',
          color: cur ? th.ink : th.faint,
          fontFamily: 'inherit',
          outline: 'none',
          cursor: disabled ? 'default' : 'pointer',
          ...css,
        },
      },
      [
        createElement('option', { key: '__ph', value: '' }, clearLabel || placeholder),
        ...list.map((o) =>
          createElement('option', { key: o.value, value: o.value, style: { color: th.ink } }, o.label)
        ),
      ]
    );
  }

  return <NativeSelect {...{ list, cur, onChange, placeholder, title, clearLabel, style, disabled }} />;
}

// ── มือถือ: ปุ่มเปิดแผ่นรายการ ──────────────────────────────
function NativeSelect({ list, cur, onChange, placeholder, title, clearLabel, style, disabled }) {
  const { t: th } = useTheme();
  const n = maken(th);

  const [open, setOpen] = useState(false);
  const label = list.find((o) => String(o.value) === cur)?.label;

  return (
    <>
      <TouchableOpacity disabled={disabled} style={[n.box, style]} onPress={() => setOpen(true)}>
        <Text style={[n.text, !label && n.ph]} numberOfLines={1}>{label || placeholder}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={n.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={n.sheet}>
            {!!title && <Text style={n.title}>{title}</Text>}
            <ScrollView>
              {!!clearLabel && (
                <TouchableOpacity style={n.row} onPress={() => { onChange(''); setOpen(false); }}>
                  <Text style={[n.rowText, n.ph]}>{clearLabel}</Text>
                </TouchableOpacity>
              )}
              {list.map((o) => (
                <TouchableOpacity key={o.value} style={n.row}
                  onPress={() => { onChange(o.value); setOpen(false); }}>
                  <Text style={[n.rowText, String(o.value) === cur && n.rowOn]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const maken = (th) => StyleSheet.create({
  box:      { backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'center' },
  text:     { fontSize: 14, color: th.ink },
  ph:       { color: th.faint },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { backgroundColor: th.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14, paddingBottom: 30, maxHeight: '70%' },
  title:    { fontSize: 13, fontWeight: '600', color: th.brand, marginBottom: 8, paddingHorizontal: 4 },
  row:      { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: th.hair },
  rowText:  { fontSize: 14, color: th.ink },
  rowOn:    { color: th.brand, fontWeight: '700' },
});
