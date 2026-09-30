// ══════════════════════════════════════════════════════════════
// TagPreview.jsx — ตัวอย่างป้ายสินค้าบนหน้าจอ (realtime)
//
// วาดด้วยตัวเลข "มิลลิเมตร" ชุดเดียวกับที่ใช้พิมพ์จริง (TAG_SPEC ใน print.js)
// คูณด้วย MM เพื่อขยายให้ดูบนจอ — พิมพ์ออกมาแล้วจะได้หน้าตาแบบเดียวกัน
// ข้อความทุกบรรทัดมาจาก tagFields() ตัวเดียวกับที่ buildTags() เรียก
// แก้ตรรกะป้ายที่ print.js ที่เดียว ตัวอย่างบนจอเปลี่ยนตาม
//
// ⚠ ไฟล์นี้วาดเอง ไม่ได้ใช้ HTML ของ buildTags() — เวลาแก้หน้าตาป้าย
//   ต้องไล่แก้ที่นี่ด้วยเสมอ ไม่งั้นตัวอย่างบนจอจะไม่ตรงกับที่พิมพ์ออกมา
// ══════════════════════════════════════════════════════════════
import { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { qrMatrix } from '../qr';
import { TAG_SPEC, tagFields, CERT_MARK, CERT_SCALE } from '../print';

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
  // ขนาดตัวอักษรทุกตัวมาจาก tagFields() (คำนวณด้วยสูตรเดียวกับหน้าพิมพ์)
  // ห้ามฮาร์ดโค้ดขนาดเอง ไม่งั้นชื่อยาว ๆ จะล้นขอบเพราะไม่ได้ย่อตาม
  const { name, sku, price, hasCert, wg, dCells, twoCol,
          nmFs, nmLines, prFs, spFs, cdFs, qrText } = tagFields(product || {});
  const { w, h, foldX, padX, qr } = TAG_SPEC;

  return (
    <View style={{ width: mm(w), height: mm(h), flexDirection: 'row', backgroundColor: '#fff',
      borderWidth: 1, borderColor: '#ece0e3', borderRadius: 5, overflow: 'hidden' }}>

      {/* หน้าหลัก — QR + ชื่อสินค้า + ราคา */}
      <View style={{ width: mm(foldX), flexDirection: 'row', alignItems: 'center',
        gap: mm(0.8), paddingHorizontal: mm(padX), overflow: 'hidden' }}>
        <Qr text={qrText} size={mm(qr)} />
        <View style={{ flex: 1, minWidth: 0, height: mm(qr), justifyContent: 'space-between' }}>
          <Text numberOfLines={nmLines} style={{ fontSize: mm(nmFs), lineHeight: mm(nmFs) * 1.18, color: '#1a0509' }}>
            {name}
            {hasCert && (
              <Text style={{ fontSize: mm(nmFs) * CERT_SCALE }}>{CERT_MARK}</Text>
            )}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: mm(prFs), fontWeight: '700', color: '#1a0509' }}>
            {price}
          </Text>
        </View>
      </View>

      {/* หน้าสเปก — SKU / น้ำหนักโลหะ / เพชร */}
      <View style={{ width: mm(w - foldX), paddingHorizontal: mm(padX), justifyContent: 'center',
        overflow: 'hidden',
        borderLeftWidth: 1, borderLeftColor: '#f2e6e9', borderStyle: 'dashed' }}>
        <Text numberOfLines={1} style={{ fontSize: mm(cdFs), fontWeight: '700', color: '#1a0509', letterSpacing: 0.2 }}>
          {sku}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: mm(spFs), lineHeight: mm(spFs) * 1.32, color: '#3a2228' }}>
          {wg}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {dCells.map((cell, i) => (
            <Text key={i} numberOfLines={1}
              style={{ fontSize: mm(spFs), lineHeight: mm(spFs) * 1.32, color: '#3a2228',
                       width: twoCol ? '50%' : '100%' }}>
              {cell}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
