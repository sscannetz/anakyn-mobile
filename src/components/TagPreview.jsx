// ══════════════════════════════════════════════════════════════
// TagPreview.jsx — ตัวอย่างป้ายสินค้าบนหน้าจอ (realtime)
//
// วาดด้วยตัวเลข "มิลลิเมตร" ชุดเดียวกับที่ใช้พิมพ์จริง (TAG_SPEC ใน print.js)
// คูณด้วย MM เพื่อขยายให้ดูบนจอ — พิมพ์ออกมาแล้วจะได้หน้าตาแบบเดียวกัน
// ข้อความทุกบรรทัดมาจาก tagFields() ตัวเดียวกับที่ buildTags() เรียก
// แก้ตรรกะป้ายที่ print.js ที่เดียว ตัวอย่างบนจอเปลี่ยนตาม
// ══════════════════════════════════════════════════════════════
import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { qrMatrix } from '../qr';
import { TAG_SPEC, tagFields } from '../print';

const MM = 5.9;                       // พิกเซลต่อ 1 มิลลิเมตร บนหน้าจอ
const mm = (v) => +(v * MM).toFixed(2);

// memo — พิมพ์ชื่อ/ราคาแล้ว QR ไม่ต้องวาดใหม่ (เปลี่ยนเฉพาะตอน SKU เปลี่ยน)
const Qr = memo(function Qr({ text, size }) {
  const q = useMemo(() => { try { return qrMatrix(text); } catch (_) { return null; } }, [text]);
  if (!q) {
    return <View style={{ width: size, height: size, backgroundColor: '#f4ebed', borderRadius: 2 }} />;
  }
  const margin = 1;
  const dim = q.size + margin * 2;
  const rects = [];
  for (let y = 0; y < q.size; y++) {
    let x = 0;
    while (x < q.size) {
      if (!q.mod[y][x]) { x++; continue; }
      let w = 1;
      while (x + w < q.size && q.mod[y][x + w]) w++;
      rects.push(<Rect key={`${y}-${x}`} x={x + margin} y={y + margin} width={w} height={1} fill="#1a0509" />);
      x += w;
    }
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${dim} ${dim}`}>
      <Rect x={0} y={0} width={dim} height={dim} fill="#ffffff" />
      {rects}
    </Svg>
  );
});

export default function TagPreview({ product, lang = 'th' }) {
  const { name, sku, price, hasCert, specs, qrText } = tagFields(product || {});
  const { w, h, foldX, padX, qr } = TAG_SPEC;

  return (
    <View style={{ width: mm(w), height: mm(h), flexDirection: 'row', backgroundColor: '#fff',
      borderWidth: 1, borderColor: '#ece0e3', borderRadius: 5, overflow: 'hidden' }}>

      {/* หน้าหลัก — QR + ชื่อสินค้า + ราคา */}
      <View style={{ width: mm(foldX), flexDirection: 'row', alignItems: 'center',
        gap: mm(0.8), paddingHorizontal: mm(padX) }}>
        <Qr text={qrText} size={mm(qr)} />
        <View style={{ flex: 1, minWidth: 0, height: mm(qr), justifyContent: 'space-between' }}>
          <Text numberOfLines={3} style={{ fontSize: mm(1.75), lineHeight: mm(1.75) * 1.15, color: '#1a0509' }}>
            {name}
          </Text>
          {hasCert && (
            <Text numberOfLines={1} style={{ fontSize: mm(1.6), color: '#550a19', fontWeight: '600' }}>
              {lang === 'th' ? 'มีใบเซอร์' : 'มีใบเซอร์'}
            </Text>
          )}
          <Text numberOfLines={1} style={{ fontSize: mm(2.3), fontWeight: '700', color: '#1a0509' }}>
            {price}
          </Text>
        </View>
      </View>

      {/* หน้าสเปก — SKU / น้ำหนักโลหะ / เพชร */}
      <View style={{ width: mm(w - foldX), paddingHorizontal: mm(padX), justifyContent: 'center',
        borderLeftWidth: 1, borderLeftColor: '#f2e6e9', borderStyle: 'dashed' }}>
        <Text numberOfLines={1} style={{ fontSize: mm(2.0), fontWeight: '700', color: '#1a0509', letterSpacing: 0.2 }}>
          {sku}
        </Text>
        {specs.filter(Boolean).slice(0, 4).map((line, i) => (
          <Text key={i} numberOfLines={1} style={{ fontSize: mm(1.7), color: '#3a2228', marginTop: mm(0.35) }}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
