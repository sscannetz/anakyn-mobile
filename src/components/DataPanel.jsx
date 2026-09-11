// ══════════════════════════════════════════════════════════════
// DataPanel.jsx — ชิ้นส่วนกลางของทุกหน้ารายการ
//
// จอกว้าง  → ตารางในกรอบเดียว มีหัวคอลัมน์ (ตามแบบที่ออกแบบไว้)
// จอแคบ    → หน้าจอเดิมของแต่ละหน้า (การ์ดเรียงลงมา) เพราะตารางแคบ ๆ อ่านไม่ออก
//
// สีทั้งหมดอ้างจากแดงหลัก #550a19 ชุดเดียว
// ══════════════════════════════════════════════════════════════
import { View, Text, TextInput, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const C = {
  primary: '#550a19',
  soft:    '#fdf0f2',
  mid:     '#8c1b2f',
  ink:     '#2c1015',
  mute:    '#9b7d86',
  dim:     '#c0a8ae',
  page:    '#fdfbfb',
  card:    '#ffffff',
  hair:    '#ece0e3',
  hair2:   '#f5edef',
  headBg:  '#fdfafb',
};

// จอกว้างพอที่ตารางจะอ่านออก
export function useWide(bp = 900) {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= bp;
}

export function Toolbar({ children }) {
  return <View style={S.toolbar}>{children}</View>;
}

export function SearchBox({ value, onChangeText, placeholder, style }) {
  return (
    <View style={[S.search, style]}>
      <MaterialCommunityIcons name="magnify" size={15} color={C.mute} />
      <TextInput
        dataSet={{ hov: 'field' }}
        style={S.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bda3aa"
      />
      {!!value && (
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close-circle" size={14} color={C.dim} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Chip({ label, on, onPress }) {
  return (
    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onPress} style={[S.chip, on && S.chipOn]}>
      <Text style={[S.chipText, on && S.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PrimaryButton({ label, icon = 'plus', onPress }) {
  return (
    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onPress} style={S.primaryBtn}>
      <MaterialCommunityIcons name={icon} size={15} color="#fff5f7" />
      <Text style={S.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ label, tone = 'done' }) {
  const st = tone === 'attn' ? S.pillAttn : tone === 'dim' ? S.pillDim : S.pillDone;
  const tx = tone === 'attn' ? S.pillAttnText : tone === 'dim' ? S.pillDimText : S.pillDoneText;
  return <View style={[S.pill, st]}><Text style={[S.pillText, tx]}>{label}</Text></View>;
}

export function Panel({ title, right, children, style }) {
  return (
    <View style={[S.panel, style]}>
      {(title != null || right != null) && (
        <View style={S.panelHead}>
          {title != null && <Text style={S.panelTitle}>{title}</Text>}
          {right != null && <Text style={S.panelRight}>{right}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

// cols: [{ label, w, rt }]  — w ว่าง = ยืดเต็มพื้นที่ที่เหลือ
export function TableHead({ cols }) {
  return (
    <View style={S.thead}>
      {cols.map((c, i) => (
        <Text key={i} style={[S.th, c.w ? { width: c.w } : { flex: 1 }, c.rt && S.rt]} numberOfLines={1}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

// cells: array ของ node หรือ string — เรียงตาม cols
export function TableRow({ cols, cells, onPress, last }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap dataSet={onPress ? { hov: 'row' } : undefined} onPress={onPress} activeOpacity={0.7}
      style={[S.trow, last && { borderBottomWidth: 0 }]}>
      {cols.map((c, i) => (
        <View key={i} style={[c.w ? { width: c.w } : { flex: 1 }, { minWidth: 0 }, c.rt && { alignItems: 'flex-end' }]}>
          {typeof cells[i] === 'string' || typeof cells[i] === 'number'
            ? <Text style={S.td} numberOfLines={1}>{cells[i]}</Text>
            : cells[i]}
        </View>
      ))}
    </Wrap>
  );
}

export function TdMain({ text, sub }) {
  return (
    <View style={{ minWidth: 0 }}>
      <Text style={S.tdMain} numberOfLines={1}>{text}</Text>
      {!!sub && <Text style={S.tdSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}
export function TdNo({ text })   { return <Text style={S.tdNo} numberOfLines={1}>{text}</Text>; }
export function TdAmt({ text })  { return <Text style={S.tdAmt} numberOfLines={1}>{text}</Text>; }
export function Empty({ text })  { return <Text style={S.empty}>{text}</Text>; }

export const S = {
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 12 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.hair, borderRadius: 10,
    paddingHorizontal: 12, minWidth: 220, flexGrow: 1, flexShrink: 1, flexBasis: 220,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12.5, color: C.ink, outlineStyle: 'none' },
  chip: {
    borderWidth: 1, borderColor: C.hair, backgroundColor: C.card,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 11.5, color: C.ink },
  chipTextOn: { color: '#fff5f7', fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 'auto',
    backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  primaryBtnText: { fontSize: 12.5, fontWeight: '600', color: '#fff5f7' },

  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.hair, borderRadius: 12, overflow: 'hidden' },
  panelHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.hair2,
  },
  panelTitle: { fontSize: 13, fontWeight: '600', color: C.ink },
  panelRight: { fontSize: 11.5, color: C.mute },

  thead: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, paddingVertical: 8,
    backgroundColor: C.headBg, borderBottomWidth: 1, borderBottomColor: C.hair2,
  },
  th: { fontSize: 9.5, letterSpacing: 0.8, color: C.mute },
  rt: { textAlign: 'right' },
  trow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.hair2,
  },
  td: { fontSize: 12, color: C.ink },
  tdNo: { fontSize: 11.5, fontWeight: '600', color: C.primary },
  tdMain: { fontSize: 12.5, color: C.ink },
  tdSub: { fontSize: 10, color: C.mute, marginTop: 1 },
  tdAmt: { fontSize: 12.5, fontWeight: '600', color: C.ink },
  empty: { fontSize: 12, color: C.mute, textAlign: 'center', paddingVertical: 26 },

  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2.5, borderWidth: 1, alignSelf: 'flex-start' },
  pillAttn: { backgroundColor: C.soft, borderColor: '#f0d3da' },
  pillDone: { backgroundColor: C.card, borderColor: C.hair },
  pillDim:  { backgroundColor: C.card, borderColor: C.hair },
  pillText: { fontSize: 10, fontWeight: '500' },
  pillAttnText: { color: C.mid },
  pillDoneText: { color: C.mute },
  pillDimText:  { color: C.dim },
};
