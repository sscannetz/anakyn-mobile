// ══════════════════════════════════════════════════════
// InventoryScreen.jsx — หน้า "สต๊อกสินค้า"
// จุดประสงค์หลัก: สั่งปริ้นป้ายสินค้า + แก้ไขข้อมูลสินค้าได้ทั้งหมด + ลบสินค้า
// ย้ายส่วนปริ้นป้ายมาจาก StockScreen (หน้าเพิ่มสต๊อกสินค้า)
// ══════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import ProductForm, { CAT_CODES, T as FORM_T } from '../components/ProductForm';
import { api } from '../api';
import { getRole } from '../storage';
import { useScaledStyles } from '../responsive';
import { printStock, printTags, saveTags } from '../print';
import {
  useWide, Toolbar, SearchBox, Chip, Panel, TableHead, TableRow, Empty,
} from '../components/DataPanel';

const T = {
  th: {
    title: 'สต๊อกสินค้า',
    searchPh: 'ค้นหาชื่อสินค้า / รหัส SKU',
    printList: 'ปริ้นรายการ / PDF',
    selectAll: 'เลือกทั้งหมด', clearAll: 'ล้างทั้งหมด', matchQty: 'ตามจำนวนคงเหลือ',
    tagHint: 'ป้ายขนาด 50 × 15 มม. — ตั้งขนาดกระดาษใน driver เครื่องพิมพ์เป็น 50×15 มม. ก่อนสั่งพิมพ์',
    stock: 'คงเหลือ', tag: 'ป้าย',
    edit: 'แก้ไข', del: 'ลบ', delConfirm: 'กดอีกครั้งเพื่อลบ',
    editTitle: 'แก้ไขข้อมูลสินค้า',
    empty: 'ยังไม่มีสินค้าในสต๊อก',
    noMatch: 'ไม่พบสินค้าที่ค้นหา',
    found: (n, all) => `พบ ${n} จาก ${all} รายการ`,
    total: (n) => `รวม ${n} รายการ`,
    queued: (n) => `ป้ายรอพิมพ์ ${n} ดวง`,
    print: 'พิมพ์', off: 'ปิดขาย',
    loadErr: 'โหลดรายการสินค้าไม่สำเร็จ',
    delErr: 'ลบสินค้าไม่สำเร็จ (อาจมีการขายที่เชื่อมโยงอยู่)',
    qtyErr: 'บันทึกจำนวนไม่สำเร็จ',
  },
  en: {
    title: 'Stock',
    searchPh: 'Search name / SKU',
    printList: 'Print list / PDF',
    selectAll: 'Select all', clearAll: 'Clear all', matchQty: 'Match stock qty',
    tagHint: 'Tag size 50 × 15 mm — set the printer driver paper size to 50×15 mm first',
    stock: 'In stock', tag: 'Tags',
    edit: 'Edit', del: 'Delete', delConfirm: 'Tap again to delete',
    editTitle: 'Edit product',
    empty: 'No products in stock yet',
    noMatch: 'No products match your search',
    found: (n, all) => `${n} of ${all} items`,
    total: (n) => `${n} items`,
    queued: (n) => `${n} tag${n === 1 ? '' : 's'} queued`,
    print: 'Print', off: 'Off sale',
    loadErr: 'Failed to load products',
    delErr: 'Failed to delete (it may be linked to a sale)',
    qtyErr: 'Failed to save quantity',
  },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};

export default function InventoryScreen({ navigation }) {
  const { styles: s, sc } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const wide   = useWide(1000);
  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [query, setQuery]     = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // ── คิวป้ายรอพิมพ์ ──
  const [tagSel, setTagSel] = useState({});   // { [productId]: จำนวนดวง }
  const tagItems  = list.filter(p => (tagSel[p.id] || 0) > 0).map(p => ({ ...p, copies: tagSel[p.id] }));
  const tagCount  = tagItems.reduce((n, p) => n + p.copies, 0);
  const setCopies = (id, n) =>
    setTagSel(prev => { const nx = { ...prev }; if (n <= 0) delete nx[id]; else nx[id] = Math.min(99, n); return nx; });

  // ── แก้ไข / ลบ ──
  const [editing, setEditing] = useState(null);   // สินค้าที่กำลังแก้
  const [delArm, setDelArm]   = useState(null);   // id ที่กดลบครั้งแรกแล้ว (รอยืนยัน)
  const [delBusy, setDelBusy] = useState(null);
  const [delErr, setDelErr]   = useState('');
  const delTimer = useRef(null);

  // ── ปรับจำนวนคงเหลือ (+/−) บันทึกหลังหยุดกด 0.6 วิ ──
  const qtyRef   = useRef({});
  const qtyTimer = useRef({});
  const [qtySaving, setQtySaving] = useState({});
  const [qtyEdit, setQtyEdit]     = useState({});
  const [qtyErr, setQtyErr]       = useState('');

  useEffect(() => {
    getRole().then(r => setIsAdmin(r === 'admin')).catch(() => {});
    api.getProducts()
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(e => setLoadErr(e?.message || t.loadErr))
      .finally(() => setLoading(false));
    return () => {
      Object.values(qtyTimer.current).forEach(clearTimeout);
      clearTimeout(delTimer.current);
    };
  }, []);

  const curQty  = (p) => qtyRef.current[p.id] ?? (parseInt(p.stock_qty, 10) || 0);
  const bumpQty = (p, delta) => setQtyAbs(p, curQty(p) + delta);

  const setQtyAbs = (p, value) => {
    const cur  = curQty(p);
    const next = Math.max(0, Math.min(9999, parseInt(value, 10) || 0));
    if (next === cur) return;
    qtyRef.current[p.id] = next;
    setList(prev => prev.map(x => (x.id === p.id ? { ...x, stock_qty: next } : x)));
    setQtyErr('');
    setQtySaving(b => ({ ...b, [p.id]: true }));

    clearTimeout(qtyTimer.current[p.id]);
    qtyTimer.current[p.id] = setTimeout(async () => {
      try {
        const val  = qtyRef.current[p.id];
        const body = { stock_qty: val };
        // มีของแล้ว → ปลดล็อกให้กลับมาขายได้ (ตอนขายหมด backend ตั้ง is_available=false ไว้)
        if (val > 0) body.is_available = true;
        const saved = await api.updateProduct(p.id, body);
        setList(prev => prev.map(x => (x.id === p.id ? { ...x, ...saved } : x)));
        delete qtyRef.current[p.id];
      } catch (e) {
        setQtyErr(e?.message || t.qtyErr);
        api.getProducts().then(data => { qtyRef.current = {}; setList(data); }).catch(() => {});  // ไม่ใส่ light — หน้านี้โชว์รูปย่อ
      } finally {
        setQtySaving(b => { const n = { ...b }; delete n[p.id]; return n; });
      }
    }, 600);
  };

  // ── ค้นหา ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => {
      const cat = FORM_T[lang].categories[CAT_CODES.indexOf(p.category)] || '';
      return [p.name, p.sku, cat].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [list, query, lang]);

  const catLabel = (code) => FORM_T[lang].categories[CAT_CODES.indexOf(code)] || '—';

  // คอลัมน์ของตาราง (ใช้เฉพาะจอกว้าง)
  const INV_COLS = [
    { label: lang === 'th' ? 'สินค้า' : 'PRODUCT' },
    { label: lang === 'th' ? 'ประเภท' : 'CATEGORY', w: 108 },
    { label: t.stock, w: 118 },
    { label: lang === 'th' ? 'ราคาขาย' : 'PRICE', w: 92, rt: true },
    { label: lang === 'th' ? 'ป้ายที่จะปริ้น' : 'TAGS', w: 108 },
    { label: '', w: isAdmin ? 178 : 92, rt: true },
  ];

  const handleUpdate = async (payload) => {
    const saved = await api.updateProduct(editing.id, payload);
    setList(prev => prev.map(x => (x.id === saved.id ? { ...x, ...saved } : x)));
    setEditing(cur => (cur ? { ...cur, ...saved } : cur));
    return saved;
  };

  const armDelete = (id) => {
    setDelErr('');
    setDelArm(id);
    clearTimeout(delTimer.current);
    delTimer.current = setTimeout(() => setDelArm(null), 4000);   // ไม่กดยืนยันใน 4 วิ → ยกเลิกเอง
  };

  const handleDelete = async (p) => {
    if (delArm !== p.id) { armDelete(p.id); return; }
    clearTimeout(delTimer.current);
    setDelArm(null); setDelBusy(p.id); setDelErr('');
    try {
      await api.deleteProduct(p.id);
      setList(prev => prev.filter(x => x.id !== p.id));
      setCopies(p.id, 0);
    } catch (e) {
      setDelErr(e?.message || t.delErr);
    } finally {
      setDelBusy(null);
    }
  };

  const headDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={t.title} subtitle={headDate} onBack={() => navigation.goBack()} lang={lang}
        onLangToggle={() => setLang(l => (l === 'th' ? 'en' : 'th'))} />
      <ConnectingBar visible={loading} lang={lang} />

      {/* ค้นหา — จอแคบเท่านั้น */}
      {!wide && (
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={sc(18)} color="#a07080" />
        <TextInput dataSet={{ hov: 'field' }} style={s.searchInput} value={query} onChangeText={setQuery}
          placeholder={t.searchPh} placeholderTextColor="#c0a0a8" />
        {!!query && (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={sc(16)} color="#c8a0b0" />
          </TouchableOpacity>
        )}
      </View>
      )}

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.tagHint}>
          <MaterialCommunityIcons name="information-outline" size={sc(14)} color="#8c1b2f" />
          <Text style={s.tagHintText}>{t.tagHint}</Text>
        </View>

        {wide && (
          <Toolbar>
            <SearchBox value={query} onChangeText={setQuery} placeholder={t.searchPh} />
            <Chip label={t.selectAll} onPress={() => { const a = { ...tagSel }; filtered.forEach(pr => { a[pr.id] = 1; }); setTagSel(a); }} />
            <Chip label={t.matchQty} onPress={() => {
              const a = { ...tagSel };
              filtered.forEach(pr => { const q = parseInt(pr.stock_qty, 10) || 0; if (q > 0) a[pr.id] = Math.min(99, q); });
              setTagSel(a);
            }} />
            <Chip label={t.clearAll} onPress={() => setTagSel({})} />
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printStock(list)} style={s.toolBtnRight}>
              <MaterialCommunityIcons name="printer" size={sc(15)} color="#550a19" />
              <Text style={s.toolBtnText}>{t.printList}</Text>
            </TouchableOpacity>
          </Toolbar>
        )}

        {/* เครื่องมือ — จอแคบ */}
        {!wide && (<>
        <View style={s.toolRow}>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printStock(list)} style={s.toolBtn}>
            <MaterialCommunityIcons name="printer" size={sc(15)} color="#550a19" />
            <Text style={s.toolBtnText}>{t.printList}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.tagBulkRow}>
          <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.tagBulkBtn}
            onPress={() => { const a = { ...tagSel }; filtered.forEach(p => { a[p.id] = 1; }); setTagSel(a); }}>
            <Text style={s.tagBulkText}>{t.selectAll}</Text>
          </TouchableOpacity>
          <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.tagBulkBtn} onPress={() => setTagSel({})}>
            <Text style={s.tagBulkText}>{t.clearAll}</Text>
          </TouchableOpacity>
          <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.tagBulkBtn}
            onPress={() => {
              const a = { ...tagSel };
              filtered.forEach(p => { const q = parseInt(p.stock_qty, 10) || 0; if (q > 0) a[p.id] = Math.min(99, q); });
              setTagSel(a);
            }}>
            <Text style={s.tagBulkText}>{t.matchQty}</Text>
          </TouchableOpacity>
        </View>

        </>)}

        {!wide && (
          <Text style={s.countText}>
            {query.trim() ? t.found(filtered.length, list.length) : t.total(list.length)}
          </Text>
        )}

        {!!loadErr && <View style={s.errBox}><Text style={s.errText}>{loadErr}</Text></View>}
        {!!delErr  && <View style={s.errBox}><Text style={s.errText}>{delErr}</Text></View>}
        {!!qtyErr  && <View style={s.errBox}><Text style={s.errText}>{qtyErr}</Text></View>}
        {loading   && <ActivityIndicator color="#550a19" style={{ marginTop: 20 }} />}
        {!wide && !loading && list.length === 0 && <Text style={s.emptyText}>{t.empty}</Text>}
        {!wide && !loading && list.length > 0 && filtered.length === 0 && <Text style={s.emptyText}>{t.noMatch}</Text>}

        {wide && !loading && (
          <Panel
            title={t.title}
            right={query.trim() ? t.found(filtered.length, list.length) : t.total(list.length)}>
            <TableHead cols={INV_COLS} />
            {filtered.length === 0 && <Empty text={list.length === 0 ? t.empty : t.noMatch} />}
            {filtered.map((p, idx) => {
              const n     = tagSel[p.id] || 0;
              const qty   = parseInt(p.stock_qty, 10) || 0;
              const armed = delArm === p.id;
              return (
                <TableRow key={p.id} cols={INV_COLS} last={idx === filtered.length - 1} cells={[
                  <View style={s.rowMain}>
                    {p.photo_url
                      ? <Image source={{ uri: p.photo_url }} style={s.thumbSm} resizeMode="cover" />
                      : <View style={[s.thumbSm, s.thumbEmpty]}>
                          <MaterialCommunityIcons name="diamond-stone" size={sc(14)} color="#c8a0b0" />
                        </View>}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowName} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.rowSku} numberOfLines={1}>
                        {p.sku}{p.is_available === false ? ` · ${t.off}` : ''}
                      </Text>
                    </View>
                  </View>,

                  <Text style={s.rowCat} numberOfLines={1}>{catLabel(p.category)}</Text>,

                  <View style={s.qtyRow}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => bumpQty(p, -1)} disabled={qty <= 0}
                      style={[s.qtyBtn, qty <= 0 && { opacity: 0.35 }]}>
                      <MaterialCommunityIcons name="minus" size={sc(13)} color="#550a19" />
                    </TouchableOpacity>
                    <View style={s.qtyValWrap}>
                      <TextInput dataSet={{ hov: 'field' }}
                        style={[s.qtyVal, qty === 0 && { color: '#c62828' }]}
                        value={qtyEdit[p.id] ?? String(qty)}
                        onChangeText={(v) => {
                          const clean = v.replace(/[^0-9]/g, '').slice(0, 4);
                          setQtyEdit(e => ({ ...e, [p.id]: clean }));
                          if (clean !== '') setQtyAbs(p, clean);
                        }}
                        onBlur={() => setQtyEdit(e => { const x = { ...e }; delete x[p.id]; return x; })}
                        keyboardType="number-pad" selectTextOnFocus textAlign="center" />
                      {qtySaving[p.id] && <View style={s.qtyDot} />}
                    </View>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => bumpQty(p, 1)} style={s.qtyBtn}>
                      <MaterialCommunityIcons name="plus" size={sc(13)} color="#550a19" />
                    </TouchableOpacity>
                  </View>,

                  <Text style={s.rowPrice}>฿{fmt(p.sale_price)}</Text>,

                  <View style={s.stepper}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setCopies(p.id, n - 1)} style={s.stepBtn}>
                      <MaterialCommunityIcons name="minus" size={sc(13)} color="#8c1b2f" />
                    </TouchableOpacity>
                    <TextInput dataSet={{ hov: 'field' }} style={[s.stepVal, n > 0 && { color: '#550a19' }]}
                      value={String(n)}
                      onChangeText={(v) => setCopies(p.id, parseInt(v.replace(/[^0-9]/g, '').slice(0, 2), 10) || 0)}
                      keyboardType="number-pad" selectTextOnFocus textAlign="center" />
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setCopies(p.id, n + 1)} style={s.stepBtn}>
                      <MaterialCommunityIcons name="plus" size={sc(13)} color="#8c1b2f" />
                    </TouchableOpacity>
                  </View>,

                  <View style={s.rowActs}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setEditing(p)} style={s.editBtn}>
                      <MaterialCommunityIcons name="pencil" size={sc(14)} color="#550a19" />
                      <Text style={s.editBtnText}>{t.edit}</Text>
                    </TouchableOpacity>
                    {isAdmin && (
                      <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => handleDelete(p)} disabled={delBusy === p.id}
                        style={[s.delBtn, armed && s.delBtnArmed]}>
                        {delBusy === p.id
                          ? <ActivityIndicator size="small" color="#a32d2d" />
                          : <MaterialCommunityIcons name="trash-can-outline" size={sc(14)} color={armed ? '#fff' : '#a32d2d'} />}
                        <Text style={[s.delBtnText, armed && { color: '#fff' }]}>{armed ? t.delConfirm : t.del}</Text>
                      </TouchableOpacity>
                    )}
                  </View>,
                ]} />
              );
            })}
          </Panel>
        )}

        {!wide && filtered.map(p => {
          const n   = tagSel[p.id] || 0;
          const qty = parseInt(p.stock_qty, 10) || 0;
          const armed = delArm === p.id;
          return (
            <View key={p.id} style={s.card}>
              <View style={s.cardTop}>
                {p.photo_url
                  ? <Image source={{ uri: p.photo_url }} style={s.thumb} resizeMode="cover" />
                  : <View style={[s.thumb, s.thumbEmpty]}>
                      <MaterialCommunityIcons name="diamond-stone" size={sc(18)} color="#c8a0b0" />
                    </View>}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={2}>{p.name}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.sku}>{p.sku}</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.sku}>{catLabel(p.category)}</Text>
                    {p.is_available === false && (
                      <View style={s.offBadge}><Text style={s.offBadgeText}>{t.off}</Text></View>
                    )}
                  </View>
                </View>
                <Text style={s.price}>฿{fmt(p.sale_price)}</Text>
              </View>

              <View style={s.cardBottom}>
                {/* จำนวนคงเหลือ */}
                <View style={s.ctrlGroup}>
                  <Text style={s.ctrlLabel}>{t.stock}</Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => bumpQty(p, -1)} disabled={qty <= 0}
                      style={[s.qtyBtn, qty <= 0 && { opacity: 0.35 }]} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="minus" size={sc(13)} color="#550a19" />
                    </TouchableOpacity>
                    <View style={s.qtyValWrap}>
                      <TextInput dataSet={{ hov: 'field' }}
                        style={[s.qtyVal, qty === 0 && { color: '#c62828' }]}
                        value={qtyEdit[p.id] ?? String(qty)}
                        onChangeText={(v) => {
                          const clean = v.replace(/[^0-9]/g, '').slice(0, 4);
                          setQtyEdit(e => ({ ...e, [p.id]: clean }));
                          if (clean !== '') setQtyAbs(p, clean);
                        }}
                        onBlur={() => setQtyEdit(e => { const x = { ...e }; delete x[p.id]; return x; })}
                        keyboardType="number-pad" selectTextOnFocus textAlign="center" />
                      {qtySaving[p.id] && <View style={s.qtyDot} />}
                    </View>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => bumpQty(p, 1)} style={s.qtyBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="plus" size={sc(13)} color="#550a19" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* จำนวนป้ายที่จะพิมพ์ */}
                <View style={s.ctrlGroup}>
                  <Text style={[s.ctrlLabel, { color: '#550a19' }]}>{t.tag}</Text>
                  <View style={s.stepper}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setCopies(p.id, n - 1)} style={s.stepBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="minus" size={sc(13)} color="#8c1b2f" />
                    </TouchableOpacity>
                    <TextInput dataSet={{ hov: 'field' }} style={[s.stepVal, n > 0 && { color: '#550a19' }]}
                      value={String(n)}
                      onChangeText={(v) => setCopies(p.id, parseInt(v.replace(/[^0-9]/g, '').slice(0, 2), 10) || 0)}
                      keyboardType="number-pad" selectTextOnFocus textAlign="center" />
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setCopies(p.id, n + 1)} style={s.stepBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="plus" size={sc(13)} color="#8c1b2f" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }} />

                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setEditing(p)} style={s.editBtn}>
                  <MaterialCommunityIcons name="pencil" size={sc(14)} color="#550a19" />
                  <Text style={s.editBtnText}>{t.edit}</Text>
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => handleDelete(p)} disabled={delBusy === p.id}
                    style={[s.delBtn, armed && s.delBtnArmed]}>
                    {delBusy === p.id
                      ? <ActivityIndicator size="small" color="#a32d2d" />
                      : <MaterialCommunityIcons name="trash-can-outline" size={sc(14)} color={armed ? '#fff' : '#a32d2d'} />}
                    <Text style={[s.delBtnText, armed && { color: '#fff' }]}>{armed ? t.delConfirm : t.del}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: tagCount > 0 ? 80 : 20 }} />
      </ScrollView>

      {/* แถบลอย — ป้ายรอพิมพ์ */}
      {tagCount > 0 && !editing && (
        <View style={[s.tagBar, { bottom: insets.bottom + 12 }]}>
          <View style={s.tagBarInfo}>
            <MaterialCommunityIcons name="tag-multiple" size={sc(17)} color="#fff" />
            <Text style={s.tagBarText}>{t.queued(tagCount)}</Text>
          </View>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setTagSel({})} style={s.tagBarIcon}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <MaterialCommunityIcons name="close" size={sc(16)} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => saveTags(tagItems)} style={s.tagBarPdf} activeOpacity={0.8}>
            <MaterialCommunityIcons name="file-pdf-box" size={sc(15)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => printTags(tagItems)} style={s.tagBarPrint} activeOpacity={0.8}>
            <MaterialCommunityIcons name="printer" size={sc(15)} color="#8c1b2f" />
            <Text style={s.tagBarPrintText}>{t.print}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* โมดัลแก้ไขสินค้า */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <View style={{ flex: 1, backgroundColor: '#fdfbfb' }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={1}>{t.editTitle}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setEditing(null)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            {!!editing && (
              <ProductForm mode="edit" lang={lang} product={editing} onSubmit={handleUpdate} />
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = {
  content: { padding: 14, paddingBottom: 30 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 14, marginTop: 14 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 13, color: '#2c1015' },
  tagHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#f0d3da', borderRadius: 10, padding: 11, marginBottom: 10 },
  tagHintText: { flex: 1, fontSize: 10.5, color: '#8c1b2f', lineHeight: 15 },
  toolRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  toolBtnText: { fontSize: 12, color: '#550a19', fontWeight: '500' },
  tagBulkRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tagBulkBtn: { borderWidth: 0.5, borderColor: '#ece0e3', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  tagBulkText: { fontSize: 10.5, color: '#550a19', fontWeight: '500' },
  countText: { fontSize: 11, color: '#a07080', marginBottom: 8 },
  errBox: { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#a32d2d' },
  emptyText: { fontSize: 12, color: '#a07080', textAlign: 'center', paddingVertical: 24 },
  toolBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 'auto', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece0e3', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
  thumbSm: { width: 34, height: 34, borderRadius: 7, borderWidth: 0.5, borderColor: '#e8d5d9' },
  rowName: { fontSize: 12.5, color: '#2c1015' },
  rowSku:  { fontSize: 10, color: '#9b7d86', marginTop: 1 },
  rowCat:  { fontSize: 11.5, color: '#806070' },
  rowPrice:{ fontSize: 12.5, fontWeight: '600', color: '#2c1015', textAlign: 'right' },
  rowActs: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ece0e3', padding: 13, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8, borderWidth: 0.5, borderColor: '#e8d5d9' },
  thumbEmpty: { backgroundColor: '#f9f4f5', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' },
  sku: { fontSize: 10, color: '#a07080' },
  dot: { fontSize: 10, color: '#c8a0b0' },
  offBadge: { backgroundColor: '#f0e4e8', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  offBadgeText: { fontSize: 9, fontWeight: '600', color: '#9a6b78' },
  price: { fontSize: 14, fontWeight: '500', color: '#550a19' },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  ctrlGroup: { gap: 3 },
  ctrlLabel: { fontSize: 9.5, color: '#a07080', marginLeft: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f4f5', borderRadius: 8, borderWidth: 0.5, borderColor: '#e8d5d9' },
  qtyBtn: { paddingHorizontal: 7, paddingVertical: 5 },
  qtyValWrap: { alignItems: 'center', justifyContent: 'center' },
  qtyVal: { minWidth: 34, paddingVertical: 4, fontSize: 12.5, fontWeight: '700', color: '#2c1015', textAlign: 'center' },
  qtyDot: { position: 'absolute', top: -1, right: -1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#e0a020' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf0f2', borderRadius: 8, borderWidth: 0.5, borderColor: '#f0d3da' },
  stepBtn: { paddingHorizontal: 7, paddingVertical: 5 },
  stepVal: { minWidth: 32, paddingVertical: 4, textAlign: 'center', fontSize: 12.5, fontWeight: '700', color: '#9b7d86' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  editBtnText: { fontSize: 11.5, color: '#550a19', fontWeight: '500' },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  delBtnArmed: { backgroundColor: '#a32d2d', borderColor: '#a32d2d' },
  delBtnText: { fontSize: 11.5, color: '#a32d2d', fontWeight: '500' },
  tagBar: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#550a19', borderRadius: 14, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  tagBarInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagBarText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  tagBarIcon: { padding: 4 },
  tagBarPdf: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  tagBarPrint: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  tagBarPrintText: { fontSize: 13, fontWeight: '700', color: '#550a19' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e8d5d9', paddingHorizontal: 16, paddingVertical: 14 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#550a19' },
};
