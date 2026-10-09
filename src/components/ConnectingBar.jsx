// ══════════════════════════════════════════════════════
// ConnectingBar.jsx — แถบ "กำลังเชื่อมต่อเซิร์ฟเวอร์..."
//
// Render free tier หลับหลังไม่มี traffic ~15 นาที คำขอแรกของวัน
// ต้องรอเครื่องตื่น 30–60 วิ ถ้าหน้าจอไม่บอกอะไรจะดูเหมือนแอปค้าง
//
// วางไว้ใต้ <Header /> ของแต่ละหน้า แล้วส่ง visible = state ที่บอกว่ากำลังโหลด
// หน้าที่โหลดซ้ำได้ (Home / Summary) ให้ส่งเฉพาะการโหลดรอบแรก
// ไม่งั้นแถบจะกะพริบทุกครั้งที่กลับเข้าหน้าหลังเซิร์ฟเวอร์ตื่นแล้ว
// ══════════════════════════════════════════════════════
import { View, Text, ActivityIndicator } from 'react-native';
import { useScaledStyles } from '../responsive';

const LABEL = {
  th: 'กำลังเชื่อมต่อเซิร์ฟเวอร์...',
  en: 'Connecting to server...',
};

export default function ConnectingBar({ visible, lang = 'th' }) {
  const { styles: s, t: th } = useScaledStyles(baseStyles);
  if (!visible) return null;
  return (
    <View style={s.bar}>
      <ActivityIndicator size="small" color={th.warn} />
      <Text style={s.text}>{LABEL[lang] || LABEL.th}</Text>
    </View>
  );
}

const baseStyles = (th) => ({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: th.warnBg,
    borderBottomWidth: 0.5, borderBottomColor: th.hair,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  text: { fontSize: 11.5, color: th.warn },
});
