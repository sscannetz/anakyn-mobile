// ══════════════════════════════════════════════════════════════
// ShellModal.jsx — หน้าต่างเด้งที่ไม่บังแถบเมนูซ้าย
//
// ปัญหาเดิม: <Modal> ของ react-native บนเว็บไปวางตัวที่ชั้นบนสุดของเอกสาร
// เลยทับแถบเมนูสีแดงที่ปักอยู่ซ้ายมือไปด้วย กดสลับหน้าไม่ได้จนกว่าจะปิดก่อน
//
// ตัวนี้บนจอกว้างวาดเป็นกล่องลอย position:fixed ที่เริ่มหลังแถบเมนูพอดี
// (left = SIDE_W) เมนูซ้ายจึงยังอยู่และกดได้ตลอด
// ใช้ fixed ไม่ใช่ absolute เพราะบางที่ถูกวางไว้ใน ScrollView
// ถ้าใช้ absolute กล่องจะเลื่อนหนีไปกับเนื้อหา
//
// จอแคบ / มือถือ → ถอยไปใช้ <Modal> เต็มจอเหมือนเดิม เพราะเมนูเป็นลิ้นชักอยู่แล้ว
//
// วิธีใช้: เปลี่ยน <Modal ...> เป็น <ShellModal ...> ได้เลย props เดิมใช้ได้หมด
//   · transparent → เนื้อในจัดกลางเองอยู่แล้ว (กล่องยืนยัน) วางทับให้เฉย ๆ
//   · ไม่ใส่ transparent → ห่อให้เป็นการ์ดมุมมนกลางจอ พร้อมฉากหลังจาง
// ══════════════════════════════════════════════════════════════
import { View, Modal, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SHELL_BP, SIDE_W } from './AppShell';
import { useTheme } from '../theme';

// กากบาทปิดมุมขวาบนของหน้าต่าง — ส่ง onClose มาเมื่อไหร่ก็ได้ปุ่มนี้
function CloseX({ onPress }) {
  const { t: th } = useTheme();
  const ST = makeST(th);
  return (
    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onPress} style={ST.x}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <MaterialCommunityIcons name="close" size={20} color={th.brand} />
    </TouchableOpacity>
  );
}

export default function ShellModal({
  visible, onRequestClose, onClose, transparent, children,
  animationType = 'slide', presentationStyle = 'pageSheet',
  maxWidth = 900,
}) {
  const { t: th } = useTheme();
  const ST = makeST(th);
  const { width } = useWindowDimensions();
  const inShell = Platform.OS === 'web' && width >= SHELL_BP;

  if (!inShell) {
    return (
      <Modal
        visible={!!visible}
        transparent={!!transparent}
        animationType={animationType}
        presentationStyle={transparent ? undefined : presentationStyle}
        onRequestClose={onRequestClose || onClose}
      >
        {onClose ? (
          <View style={{ flex: 1 }}>
            {children}
            <CloseX onPress={onClose} />
          </View>
        ) : children}
      </Modal>
    );
  }

  if (!visible) return null;

  // เนื้อในมีฉากหลังของตัวเองอยู่แล้ว (กล่องยืนยัน) — วางทับพื้นที่เนื้อหาเฉย ๆ
  // ห้ามจัดกลางให้ซ้ำ ไม่งั้นฉากหลังจะหดเหลือเท่ากล่อง ไม่คลุมทั้งพื้นที่
  if (transparent) return <View style={ST.plain}>{children}</View>;

  return (
    <View style={ST.fixed}>
      <TouchableOpacity style={ST.backdrop} activeOpacity={1}
        onPress={() => (onClose || onRequestClose || (() => {}))()} />
      <View style={[ST.card, { maxWidth }]}>
        {children}
        {!!onClose && <CloseX onPress={onClose} />}
      </View>
    </View>
  );
}

const makeST = (th) => ({
  plain: {
    position: 'fixed',
    top: 0, left: SIDE_W, right: 0, bottom: 0,
    zIndex: 60,
  },
  fixed: {
    position: 'fixed',
    top: 0, left: SIDE_W, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    padding: 26,
    zIndex: 60,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(44,16,21,0.42)',
  },
  x: {
    position: 'absolute',
    top: 12, right: 12,
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: th.card,
    borderWidth: 1, borderColor: th.line,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 5,
  },
  card: {
    width: '100%',
    height: '92%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: th.bg,
    shadowColor: th.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 46,
  },
});
