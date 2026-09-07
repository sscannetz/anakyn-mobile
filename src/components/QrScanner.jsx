// ══════════════════════════════════════════════════════
// QrScanner.jsx — กล้องสแกน QR ในหน้าเว็บ/แอป (ไม่ต้องออกจากหน้า)
//   • สแกนติดกันหลายชิ้นได้ ตะกร้าไม่หาย
//   • กันสแกนซ้ำ: รหัสเดิมภายใน 2.5 วินาที จะไม่ยิงซ้ำ
//   • เว็บ: expo-camera ถอด QR ด้วย jsQR ใน Web Worker (ต้องเปิดผ่าน https)
// ══════════════════════════════════════════════════════
import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { useScaledStyles } from '../responsive';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function QrScanner({ visible, onClose, onScan, note, count = 0, lang = 'th' }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  const [perm, requestPerm] = useCameraPermissions();
  const last = useRef({ code: '', at: 0 });
  const th = lang === 'th';

  const handle = ({ data }) => {
    const now = Date.now();
    if (data === last.current.code && now - last.current.at < 2500) return; // กันยิงรัว
    last.current = { code: data, at: now };
    onScan(data);
  };

  const noteText = () => {
    if (!note) return th ? 'เล็ง QR บนป้ายให้อยู่ในกรอบ' : 'Point the camera at the QR on the tag';
    if (note.ok) return (th ? '✓ เพิ่มแล้ว: ' : '✓ Added: ') + note.text;
    if (note.reason === 'busy')     return (th ? 'กำลังค้นหา ' : 'Searching ') + note.text + '...';
    if (note.reason === 'sold')     return (th ? '✕ ปิดการขายไว้: ' : '✕ Not available: ') + note.text;
    if (note.reason === 'error')    return th ? '✕ ค้นหาไม่สำเร็จ — เช็กอินเทอร์เน็ต' : '✕ Lookup failed';
    return (th ? '✕ ไม่พบรหัส ' : '✕ Code not found: ') + note.text;
  };
  const noteOk = !note || note.ok || note.reason === 'busy';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        {/* หัวข้อ */}
        <View style={s.head}>
          <Text style={s.title}>{th ? 'สแกน QR บนป้ายสินค้า' : 'Scan tag QR'}</Text>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={sc(24)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* กล้อง */}
        <View style={s.camWrap}>
          {!perm ? null : !perm.granted ? (
            <View style={s.center}>
              <MaterialCommunityIcons name="camera-off-outline" size={sc(44)} color="#8a7d83" />
              <Text style={s.permText}>
                {th ? 'ต้องอนุญาตให้ใช้กล้องก่อนถึงจะสแกนได้' : 'Camera permission is required'}
              </Text>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={requestPerm} style={s.permBtn}>
                <MaterialCommunityIcons name="camera" size={sc(16)} color="#fff" />
                <Text style={s.permBtnText}>{th ? 'อนุญาตใช้กล้อง' : 'Allow camera'}</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && (
                <Text style={s.hint}>
                  {th ? 'ถ้ากดแล้วไม่ขึ้น ให้เช็กว่าเบราว์เซอร์ไม่ได้บล็อกกล้องไว้ (ไอคอนกล้องบนแถบที่อยู่เว็บ)'
                      : 'If nothing happens, check the camera icon in the browser address bar'}
                </Text>
              )}
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handle}
              />
              {/* กรอบเล็ง */}
              <View pointerEvents="none" style={s.center}>
                <View style={s.frame} />
              </View>
            </>
          )}
        </View>

        {/* แถบสถานะล่าง */}
        <View style={s.foot}>
          <View style={[s.noteBox, !noteOk && s.noteBoxErr]}>
            <Text style={[s.noteText, !noteOk && { color: '#ffd7d7' }]} numberOfLines={2}>{noteText()}</Text>
          </View>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onClose} style={s.doneBtn}>
            <MaterialCommunityIcons name="cart-check" size={sc(17)} color="#550a19" />
            <Text style={s.doneText}>
              {th ? `เสร็จแล้ว (${count} ชิ้น)` : `Done (${count})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const baseStyles = {
  root:     { flex: 1, backgroundColor: '#1a0d11' },
  head:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  title:    { fontSize: 15, fontWeight: '600', color: '#fff' },
  camWrap:  { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  center:   { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  frame:    { width: 210, height: 210, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 20 },
  permText: { fontSize: 13, color: '#e0d0d5', textAlign: 'center' },
  permBtn:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#550a19', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  permBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  hint:     { fontSize: 11, color: '#8a7d83', textAlign: 'center', lineHeight: 17 },
  foot:     { padding: 14, gap: 10 },
  noteBox:  { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  noteBoxErr: { backgroundColor: 'rgba(198,40,40,0.35)' },
  noteText: { fontSize: 12.5, color: '#fff', lineHeight: 18 },
  doneBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13 },
  doneText: { fontSize: 14, fontWeight: '700', color: '#550a19' },
};
