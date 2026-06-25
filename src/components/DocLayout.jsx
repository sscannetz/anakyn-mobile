// ══════════════════════════════════════════════════════
// DocLayout.jsx — ชุด component เอกสารทางการ (RN) ใช้ร่วมกันทุกหน้า
// แปลงดีไซน์จากเวอร์ชันเว็บ (DocWrapper / DocHeader / Parties / Sec / ...)
// ══════════════════════════════════════════════════════
import { View, Text, StyleSheet } from 'react-native';

export const DOC = {
  maroon: '#550a19', cream: '#fff5f7', rose: '#d4a0ac', mute: '#a07080',
  ink: '#2c1015', sub: '#806070', line: '#f0e4e8', soft: '#f9f4f5',
  chipBd: '#e8d5d9', pink: '#fdf5f7', red: '#c62828',
};

const fmtBaht = (n) => {
  const x = Number(n);
  return '฿' + Math.round(Number.isFinite(x) ? x : 0).toLocaleString('th-TH');
};

export function DocWrapper({ children }) {
  return <View style={d.wrap}>{children}</View>;
}

export function DocHeader({ badge, docNo, meta = [] }) {
  return (
    <View style={d.header}>
      <View style={d.headerTop}>
        <View>
          <Text style={d.brand}>ANAKYN</Text>
          <Text style={d.brandSub}>GEMS</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={d.badge}><Text style={d.badgeText}>{badge}</Text></View>
          <Text style={d.docNo}>{docNo || '—'}</Text>
        </View>
      </View>
      {meta.length > 0 && (
        <View style={d.metaRow}>
          {meta.map(([l, v], i) => (
            <View key={l + i} style={{ flex: 1, alignItems: i === meta.length - 1 ? 'flex-end' : 'flex-start' }}>
              <Text style={d.metaLabel}>{l}</Text>
              <Text style={d.metaVal} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function Parties({ seller, buyer }) {
  const list = [seller, buyer].filter(Boolean);
  return (
    <View style={d.parties}>
      {list.map((p, i) => (
        <View key={p.label} style={[d.party, i === 0 && list.length > 1 ? d.partyBorder : null]}>
          <Text style={d.partyLabel}>{p.label}</Text>
          <Text style={d.partyName}>{p.name || 'ไม่ระบุ'}</Text>
          {!!p.sub && <Text style={d.partySub}>{p.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

export function Sec({ children, tint, style }) {
  return <View style={[d.sec, tint && { backgroundColor: tint }, style]}>{children}</View>;
}

export function SL({ children }) {
  return <Text style={d.sl}>{children}</Text>;
}

// แถวหัวตารางสินค้า: รายการ | จำนวน | ราคา
export function ItemHead({ cols = ['รายการ', 'จำนวน', 'ราคา'] }) {
  return (
    <View style={d.itemHead}>
      <Text style={[d.itemHeadText, { flex: 1 }]}>{cols[0]}</Text>
      <Text style={[d.itemHeadText, { width: 46, textAlign: 'center' }]}>{cols[1]}</Text>
      <Text style={[d.itemHeadText, { width: 80, textAlign: 'right' }]}>{cols[2]}</Text>
    </View>
  );
}

export function ItemRow({ name, sub, specs = [], qty, price }) {
  return (
    <View style={d.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={d.itemName}>{name || 'รายการ'}</Text>
        {!!sub && <Text style={d.itemSub}>{sub}</Text>}
        {specs.length > 0 && (
          <View style={d.chipWrap}>
            {specs.map((s, i) => <Chip key={i}>{s}</Chip>)}
          </View>
        )}
      </View>
      <Text style={[d.itemQty, { width: 46 }]}>{qty != null ? String(qty) : ''}</Text>
      <Text style={[d.itemPrice, { width: 80 }]}>{fmtBaht(price)}</Text>
    </View>
  );
}

export function Chip({ children }) {
  return <View style={d.chip}><Text style={d.chipText}>{children}</Text></View>;
}

export function TRow({ label, value, color, borderTop }) {
  return (
    <View style={[d.trow, borderTop && d.trowBorder]}>
      <Text style={d.trowLabel}>{label}</Text>
      <Text style={[d.trowVal, color && { color }]}>{value}</Text>
    </View>
  );
}

export function GrandTotal({ label, value }) {
  return (
    <View style={d.grand}>
      <Text style={d.grandLabel}>{label}</Text>
      <Text style={d.grandVal}>{value}</Text>
    </View>
  );
}

export function InfoRow({ label, value }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={d.infoLabel}>{label}</Text>
      <Text style={d.infoVal}>{value || '—'}</Text>
    </View>
  );
}

export function DocFooter({ children }) {
  return <Text style={d.footer}>{children}</Text>;
}

export { fmtBaht };

const d = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#c8a0b0', borderRadius: 14, overflow: 'hidden' },

  header: { backgroundColor: DOC.maroon, paddingHorizontal: 16, paddingTop: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  brand: { fontSize: 20, fontWeight: '600', color: '#fff5f7', letterSpacing: 4 },
  brandSub: { fontSize: 9, color: DOC.rose, letterSpacing: 5, marginTop: 1 },
  badge: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 },
  badgeText: { fontSize: 10, color: '#f0d0d8', letterSpacing: 1 },
  docNo: { fontSize: 13, fontWeight: '600', color: '#fff5f7' },
  metaRow: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  metaLabel: { fontSize: 9, color: DOC.rose, letterSpacing: 1 },
  metaVal: { fontSize: 11, fontWeight: '500', color: '#f5e8eb', marginTop: 1 },

  parties: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: DOC.line },
  party: { flex: 1, paddingHorizontal: 14, paddingVertical: 11 },
  partyBorder: { borderRightWidth: 0.5, borderRightColor: DOC.line },
  partyLabel: { fontSize: 9, color: DOC.mute, letterSpacing: 1.5, marginBottom: 5 },
  partyName: { fontSize: 12, fontWeight: '600', color: DOC.ink },
  partySub: { fontSize: 10, color: DOC.mute, lineHeight: 15, marginTop: 2 },

  sec: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: DOC.line },
  sl: { fontSize: 9, color: DOC.mute, letterSpacing: 1.5, marginBottom: 8 },

  itemHead: { flexDirection: 'row', paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: DOC.chipBd, borderStyle: 'dashed', marginBottom: 8 },
  itemHeadText: { fontSize: 9, color: DOC.mute, letterSpacing: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: DOC.soft },
  itemName: { fontSize: 12, fontWeight: '500', color: DOC.ink },
  itemSub: { fontSize: 10, color: DOC.mute, marginTop: 1 },
  itemQty: { fontSize: 12, color: DOC.ink, textAlign: 'center' },
  itemPrice: { fontSize: 12, fontWeight: '600', color: DOC.maroon, textAlign: 'right' },
  chipWrap: { flexDirection: 'row', gap: 3, flexWrap: 'wrap', marginTop: 4 },
  chip: { backgroundColor: DOC.soft, borderWidth: 0.5, borderColor: DOC.chipBd, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  chipText: { fontSize: 10, color: DOC.sub },

  trow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  trowBorder: { borderTopWidth: 0.5, borderTopColor: DOC.line, marginTop: 5, paddingTop: 6 },
  trowLabel: { fontSize: 12, color: DOC.sub },
  trowVal: { fontSize: 12, fontWeight: '600', color: DOC.ink },

  grand: { backgroundColor: DOC.maroon, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  grandLabel: { fontSize: 13, fontWeight: '500', color: '#f0d0d8' },
  grandVal: { fontSize: 20, fontWeight: '600', color: '#fff5f7' },

  infoLabel: { fontSize: 10, color: DOC.mute, marginBottom: 2 },
  infoVal: { fontSize: 13, fontWeight: '500', color: DOC.ink, lineHeight: 18 },

  footer: { paddingHorizontal: 14, paddingVertical: 10, textAlign: 'center', fontSize: 10, color: DOC.mute, lineHeight: 16, borderBottomWidth: 0.5, borderBottomColor: DOC.line },
});
