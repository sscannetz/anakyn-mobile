// ══════════════════════════════════════════════════════════════
// DateInput.jsx — ช่องวันที่ที่กดแล้วมีปฏิทินให้เลือก และพิมพ์เองก็ได้
//
// บนเว็บใช้ <input type="date"> ของเบราว์เซอร์ตรง ๆ เพราะได้ทั้ง 2 อย่างในตัวเดียว
//   · กดที่ไอคอนปฏิทิน = ปฏิทินเลื่อนลงมาให้เลือก
//   · พิมพ์ทับที่ช่อง วัน / เดือน / ปี ได้เหมือนเดิม
// react-native-web วิ่งบน React DOM อยู่แล้ว เลย createElement('input') ได้เลย
// ไม่ต้องลงไลบรารีปฏิทินเพิ่มให้ bundle บวม
//
// บนมือถือ (Expo native) ไม่มี <input> ก็ถอยไปใช้ TextInput พิมพ์เองเหมือนเดิม
//
// ค่าที่เก็บเป็น "YYYY-MM-DD" ตรงกับที่ Postgres รับพอดี ไม่ต้องแปลงที่ไหนอีก
// ══════════════════════════════════════════════════════════════
import { createElement } from 'react';
import { Platform, TextInput } from 'react-native';
import { useTheme } from '../theme';

// ตัดให้เหลือ YYYY-MM-DD เสมอ — ค่าที่มาจาก API เป็น timestamp เต็มรูปแบบ
const toDay = (v) => (v ? String(v).slice(0, 10) : '');

export default function DateInput({ value, onChangeText, placeholder, style }) {
  const { t: th } = useTheme();

  const day = toDay(value);

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value: day,
      onChange: (e) => onChangeText(e.target.value),
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
        color: day ? th.ink : th.faint,
        fontFamily: 'inherit',
        outline: 'none',
      },
    });
  }

  return (
    <TextInput
      dataSet={{ hov: 'field' }}
      style={style}
      value={day}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={th.faint}
    />
  );
}
