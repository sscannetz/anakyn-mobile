// ══════════════════════════════════════════════════════
// StockScreen.jsx — React Native version of AnakynAddStock
// ══════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Modal, FlatList, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { api } from '../api';
import { useScaledStyles } from '../responsive';
import { printStock, printTags, saveTags } from '../print';

const GOLD_BAHT_GRAMS = 15.244;
const GOLD_OPTIONS = [
  { key: '9K',  factor: 0.50 },
  { key: '14K', factor: 0.75 },
  { key: '18K', factor: 0.90 },
];
const METAL_TABS = [
  { key: '9K',     label: '9K',     col: '#b87020', bg: '#fff8e8', border: '#e0c070' },
  { key: '14K',    label: '14K',    col: '#b87020', bg: '#fff8e8', border: '#e0c070' },
  { key: '18K',    label: '18K',    col: '#b87020', bg: '#fff8e8', border: '#e0c070' },
  { key: 'silver', label: 'Silver', col: '#3060a0', bg: '#f0f4ff', border: '#90b8d8' },
];
const SHAPES = [
  'Round Brilliant','Princess Cut','Cushion Cut','Emerald Cut','Asscher Cut',
  'Radiant Cut','Oval Cut','Pear Cut','Marquise Cut','Heart Cut',
  'Elongated Cushion Cut','Baguette Cut','Old Mine Cut','Old European Cut','Rose Cut',
  'Trillion Cut','Kite Cut','Shield Cut','Hexagon Cut',
];
const COLORS   = ['D','E','F','G','H','I','J','K','L','M','Fancy Yellow','Fancy Pink','Fancy Blue','Fancy Green'];
const CLARITY  = ['FL','IF','VVS1','VVS2','VS1','VS2','SI1','SI2','I1','I2','I3'];

const T = {
  th: {
    pageTitle: 'เพิ่มสินค้าใหม่', skuSection: 'รหัสสินค้า (SKU)',
    photoSection: 'รูปสินค้า', photoHint: 'ถ่ายรูป / อัพโหลด',
    photoTakeNew: 'ถ่ายรูปใหม่', photoGallery: 'เลือกจากคลัง',
    infoSection: 'ข้อมูลทั่วไป',
    itemName: 'ชื่อสินค้า', itemNamePh: 'เช่น แหวนเพชร Solitaire',
    category: 'หมวดหมู่', stockQty: 'จำนวนในสต๊อก', laborCost: 'ค่าแรงช่าง (บาท)',
    metalSection: 'วัสดุโลหะ',
    goldPriceLabel: 'ราคาทองคำ / บาทละ (96.5%)', silverPriceLabel: 'ราคาเงิน 925 / กรัม',
    actualWeight: 'น้ำหนักจริง (g)', adjWeight: 'น้ำหนัก +10% (g)',
    diamondSection: 'ข้อมูลเพชร',
    dWeight: 'น้ำหนัก (ct)', dQty: 'จำนวน (เม็ด)',
    dShape: 'ทรงเพชร', dColor: 'สีเพชร', dClarity: 'ความสะอาด',
    dCost: 'ราคาต้นทุนเพชร (บาท)',
    hasCert: 'มีใบเซอร์', noCert: 'ไม่มีใบเซอร์',
    certLab: 'ออกโดย', reportNo: 'Report No.',
    addDiamond: 'เพิ่มเพชรเม็ดถัดไป',
    summarySection: 'สรุปราคา',
    totalCost: 'ราคาทุนรวม', sellingPrice: 'ราคาขาย (กรอกเอง)', profit: 'กำไร',
    saveBtn: (sku) => `บันทึก ${sku} ลงสต๊อก`,
    saving: 'กำลังบันทึก...',
    saveSuccess: 'บันทึกสินค้าเรียบร้อย ✓',
    currentStock: 'สต๊อกปัจจุบัน',
    categories: ['แหวน','สร้อยคอ','ต่างหู','กำไล','จี้','อื่นๆ'],
    selectPh: 'เลือก...',
  },
  en: {
    pageTitle: 'Add New Item', skuSection: 'Product Code (SKU)',
    photoSection: 'Product Photo', photoHint: 'Take photo / Upload',
    photoTakeNew: 'Take new photo', photoGallery: 'Choose from gallery',
    infoSection: 'General Info',
    itemName: 'Product Name', itemNamePh: 'e.g. Solitaire Diamond Ring',
    category: 'Category', stockQty: 'Stock Qty', laborCost: 'Labor Cost (THB)',
    metalSection: 'Metal',
    goldPriceLabel: 'Gold price per baht (96.5%)', silverPriceLabel: 'Silver 925 price per gram',
    actualWeight: 'Actual Weight (g)', adjWeight: 'Weight +10% (g)',
    diamondSection: 'Diamond Info',
    dWeight: 'Weight (ct)', dQty: 'Qty (pcs)',
    dShape: 'Shape', dColor: 'Color', dClarity: 'Clarity',
    dCost: 'Diamond Cost (THB)',
    hasCert: 'Has Certificate', noCert: 'No Certificate',
    certLab: 'Issued by', reportNo: 'Report No.',
    addDiamond: 'Add Next Diamond',
    summarySection: 'Price Summary',
    totalCost: 'Total Cost', sellingPrice: 'Selling Price (manual)', profit: 'Profit',
    saveBtn: (sku) => `Save ${sku} to Stock`,
    saving: 'Saving...',
    saveSuccess: 'Saved successfully ✓',
    currentStock: 'Current Stock',
    categories: ['Ring','Necklace','Earring','Bracelet','Pendant','Other'],
    selectPh: 'Select...',
  },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};
const initD = () => ({ id: Date.now() + Math.random(), weight: '', qty: '1', shape: '', color: '', clarity: '', hasCert: false, certLab: 'GIA', certNo: '', cost: '' });

const categoryMap = { 'แหวน':'ring','สร้อยคอ':'necklace','ต่างหู':'earring','กำไล':'bracelet','จี้':'pendant','อื่นๆ':'other', 'Ring':'ring','Necklace':'necklace','Earring':'earring','Bracelet':'bracelet','Pendant':'pendant','Other':'other' };

function Field({ label, children }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>{children}</View>;
}
function Sec({ children }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  return <View style={s.sec}>{children}</View>;
}
function SecHead({ icon, children, col = '#550a19' }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  return (
    <View style={s.secHead}>
      <MaterialCommunityIcons name={icon} size={sc(14)} color={col} />
      <Text style={[s.secHeadText, { color: col }]}>{children}</Text>
    </View>
  );
}
function Toggle({ on, onChange }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  return (
    <TouchableOpacity onPress={() => onChange(!on)} style={[s.toggle, { backgroundColor: on ? '#550a19' : '#e0d8da' }]}>
      <View style={[s.toggleKnob, { left: on ? 18 : 2 }]} />
    </TouchableOpacity>
  );
}

export default function StockScreen({ navigation }) {
  const { styles: s, sc, center } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [stockList, setStockList]   = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [skuNum, setSkuNum]         = useState(1);
  const [photoUri, setPhotoUri]     = useState(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  // ── พิมพ์ป้ายสินค้า (tag 50×15 มม.) ──
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSel, setTagSel]   = useState({}); // { [productId]: จำนวนดวง }

  const tagItems = stockList.filter(p => (tagSel[p.id] || 0) > 0)
    .map(p => ({ ...p, copies: tagSel[p.id] }));
  const tagCount = tagItems.reduce((n, p) => n + p.copies, 0);
  const setCopies = (id, n) =>
    setTagSel(prev => { const nx = { ...prev }; if (n <= 0) delete nx[id]; else nx[id] = Math.min(99, n); return nx; });
  // กด + ที่รายการสินค้า → เพิ่มเข้าคิวรอพิมพ์ทีละ 1 ดวง
  const addTag = (id) => setCopies(id, (tagSel[id] || 0) + 1);

  // ── ปรับจำนวนคงเหลือในสต๊อก (+/−) ──
  // อัปเดตหน้าจอทันที แล้วค่อยบันทึกขึ้นเซิร์ฟเวอร์หลังหยุดกด 0.6 วิ
  // (กดรัว ๆ 5 ครั้ง จะยิง API แค่ครั้งเดียวด้วยค่าสุดท้าย)
  const qtyRef    = useRef({});   // id → จำนวนล่าสุดที่ผู้ใช้กด
  const qtyTimer  = useRef({});   // id → timer
  const [qtySaving, setQtySaving] = useState({});
  const [qtyErr, setQtyErr]       = useState('');

  const [qtyEdit, setQtyEdit] = useState({});   // id → ข้อความที่กำลังพิมพ์ในช่อง

  const curQty  = (p) => qtyRef.current[p.id] ?? (parseInt(p.stock_qty, 10) || 0);
  const bumpQty = (p, delta) => setQtyAbs(p, curQty(p) + delta);

  // ตั้งจำนวนเป็นค่าที่ระบุ (ใช้ทั้งปุ่ม +/− และการพิมพ์เลขเอง)
  const setQtyAbs = (p, value) => {
    const cur  = curQty(p);
    const next = Math.max(0, Math.min(9999, parseInt(value, 10) || 0));
    if (next === cur) return;
    qtyRef.current[p.id] = next;
    setStockList(prev => prev.map(x => (x.id === p.id ? { ...x, stock_qty: next } : x)));
    setQtyErr('');
    setQtySaving(b => ({ ...b, [p.id]: true }));

    clearTimeout(qtyTimer.current[p.id]);
    qtyTimer.current[p.id] = setTimeout(async () => {
      try {
        const val  = qtyRef.current[p.id];
        const body = { stock_qty: val };
        // มีของแล้ว → ปลดล็อกให้กลับมาขายได้
        // (ตอนขายหมด backend ตั้ง is_available=false ไว้ ถ้าไม่ปลดสินค้าจะไม่โผล่ในหน้าบันทึกขาย)
        // ถ้าเหลือ 0 ปล่อยไว้เฉย ๆ ไม่ปิดการขายให้อัตโนมัติ
        if (val > 0) body.is_available = true;
        const saved = await api.updateProduct(p.id, body);
        setStockList(prev => prev.map(x => (x.id === p.id ? { ...x, ...saved } : x)));
        delete qtyRef.current[p.id];
      } catch (e) {
        setQtyErr(e?.message || (lang === 'th' ? 'บันทึกจำนวนไม่สำเร็จ' : 'Failed to save quantity'));
        // ดึงค่าจริงจากเซิร์ฟเวอร์กลับมา กันตัวเลขบนจอเพี้ยนจากของจริง
        api.getProducts()
          .then(data => { qtyRef.current = {}; setStockList(data); })
          .catch(() => {});
      } finally {
        setQtySaving(b => { const n = { ...b }; delete n[p.id]; return n; });
      }
    }, 600);
  };

  // เคลียร์ timer ที่ค้างอยู่ตอนออกจากหน้า
  useEffect(() => () => Object.values(qtyTimer.current).forEach(clearTimeout), []);

  const [goldPrice, setGoldPrice]   = useState('67300');
  const [silverPrice, setSilverPrice] = useState('33.50');
  const [metalKey, setMetalKey]     = useState('18K');
  const [metalWeight, setMetalWeight] = useState('');
  const [laborCost, setLaborCost]   = useState('');
  const [itemName, setItemName]     = useState('');
  const [category, setCategory]     = useState(t.categories[0]);
  const [qty, setQty]               = useState('1');
  const [diamonds, setDiamonds]     = useState([initD()]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dropdown modal state
  const [dropdownTarget, setDropdownTarget] = useState(null); // { diamondId, field, options }
  const [dropdownQuery, setDropdownQuery]   = useState('');

  useEffect(() => {
    api.getProducts().then(data => { setStockList(data); setSkuNum(data.length + 1); }).catch(() => {}).finally(() => setLoadingList(false));
  }, []);

  useEffect(() => { setCategory(T[lang].categories[0]); }, [lang]);

  const isGold   = metalKey !== 'silver';
  const isSilver = metalKey === 'silver';
  const tab      = METAL_TABS.find(m => m.key === metalKey) || METAL_TABS[2];
  const goldOpt  = GOLD_OPTIONS.find(o => o.key === metalKey) || GOLD_OPTIONS[2];

  const wNum     = parseFloat(metalWeight) || 0;
  const wAdj     = wNum * 1.1;
  const gpg      = (parseFloat(goldPrice) || 0) / GOLD_BAHT_GRAMS;
  const goldCost = isGold   ? Math.round(wAdj * gpg * goldOpt.factor) : 0;
  const silvCost = isSilver ? Math.round(wAdj * (parseFloat(silverPrice) || 0)) : 0;
  const metalCost= isGold ? goldCost : silvCost;
  const dTotalCost = diamonds.reduce((s, d) => s + (parseFloat(d.cost) || 0), 0);
  const totalCost  = metalCost + dTotalCost + (parseFloat(laborCost) || 0);
  const skuLabel   = `ANAKYN#${String(skuNum).padStart(4, '0')}`;

  const updD = (id, k, v) => setDiamonds(ds => ds.map(d => d.id === id ? { ...d, [k]: v } : d));

  const pickPhoto = async (fromCamera) => {
    setPhotoMenuOpen(false);
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 600 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPhotoUri(manipResult.uri);
    }
  };

  const handleSave = async () => {
    if (!itemName.trim() || !sellingPrice) {
      setSaveError(lang === 'th' ? 'กรุณากรอกชื่อสินค้าและราคาขาย' : 'Please fill name and selling price');
      return;
    }
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      let photoBase64 = null;
      if (photoUri) {
        const data = await fetch(photoUri);
        const blob = await data.blob();
        photoBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      const newProduct = await api.createProduct({
        sku: skuLabel, name: itemName,
        category: categoryMap[category] || 'other',
        photo_url: photoBase64,
        metal_type: metalKey,
        metal_weight_g: wNum || null,
        metal_weight_adj_g: wNum > 0 ? wAdj : null,
        gold_price_at_creation: isGold ? parseFloat(goldPrice) : null,
        silver_price_at_creation: isSilver ? parseFloat(silverPrice) : null,
        metal_cost: metalCost,
        labor_cost: parseFloat(laborCost) || 0,
        diamonds: diamonds.filter(d => d.weight || d.cost).map(d => ({
          weight: parseFloat(d.weight) || 0, qty: parseInt(d.qty) || 1,
          shape: d.shape, color: d.color, clarity: d.clarity,
          hasCert: d.hasCert, certLab: d.certLab, certNo: d.certNo,
          cost: parseFloat(d.cost) || 0,
        })),
        diamond_total_cost: dTotalCost,
        has_certificate: diamonds.some(d => d.hasCert),
        certificate_no: diamonds[0]?.certNo || null,
        cost_price: totalCost,
        sale_price: parseFloat(sellingPrice),
        stock_qty: parseInt(qty) || 1,
      });
      setStockList(prev => [newProduct, ...prev]);
      setSaveSuccess(true);
      setSkuNum(n => n + 1);
      setItemName(''); setMetalWeight(''); setLaborCost(''); setSellingPrice('');
      setDiamonds([initD()]); setQty('1'); setPhotoUri(null);
    } catch (err) {
      setSaveError(err.message || 'ไม่สามารถบันทึกสินค้าได้');
    } finally {
      setSaving(false);
    }
  };

  const openDropdown = (diamondId, field, options) => {
    setDropdownTarget({ diamondId, field, options });
    setDropdownQuery('');
  };

  const filteredDropdown = dropdownTarget?.options.filter(o =>
    !dropdownQuery || o.toLowerCase().includes(dropdownQuery.toLowerCase())
  ) || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f4f5', paddingTop: insets.top }}>
      <Header title={t.pageTitle} onBack={() => navigation.goBack()} lang={lang} onLangToggle={() => setLang(l => l === 'th' ? 'en' : 'th')} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {!!saveError   && <View style={s.errBox}><Text style={s.errText}>{saveError}</Text></View>}
        {saveSuccess   && <View style={s.okBox}><Text style={s.okText}>{t.saveSuccess}</Text></View>}

        {/* SKU */}
        <Sec>
          <SecHead icon="barcode">{t.skuSection}</SecHead>
          <View style={s.skuRow}>
            <View style={s.skuPrefix}><Text style={s.skuPrefixText}>ANAKYN</Text></View>
            <Text style={s.skuNum}>#{String(skuNum).padStart(4, '0')}</Text>
            <TouchableOpacity onPress={() => setSkuNum(n => Math.max(1, n - 1))} style={s.skuBtn}><Text style={s.skuBtnText}>−1</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setSkuNum(stockList.length + 1)} style={s.skuBtn}><Text style={s.skuBtnText}>Reset</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setSkuNum(n => n + 1)} style={[s.skuBtn, s.skuBtnPlus]}><Text style={[s.skuBtnText, { color: '#550a19' }]}>+1</Text></TouchableOpacity>
          </View>
        </Sec>

        {/* PHOTO */}
        <Sec>
          <SecHead icon="camera">{t.photoSection}</SecHead>
          {photoUri ? (
            <View>
              <Image source={{ uri: photoUri }} style={s.photo} />
              <View style={s.photoOverlay}>
                <TouchableOpacity onPress={() => setPhotoMenuOpen(true)} style={s.photoBtn}>
                  <MaterialCommunityIcons name="camera" size={sc(14)} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPhotoUri(null)} style={s.photoBtn}>
                  <MaterialCommunityIcons name="trash-can" size={sc(14)} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setPhotoMenuOpen(true)} style={s.photoPlaceholder}>
              <MaterialCommunityIcons name="camera" size={sc(24)} color="#c8a0b0" />
              <Text style={s.photoHint}>{t.photoHint}</Text>
            </TouchableOpacity>
          )}
        </Sec>

        {/* INFO */}
        <Sec>
          <SecHead icon="information">{t.infoSection}</SecHead>
          <Field label={t.itemName}>
            <TextInput style={s.input} value={itemName} onChangeText={setItemName} placeholder={t.itemNamePh} placeholderTextColor="#c0a0a8" />
          </Field>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>{t.category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {t.categories.map(c => (
                    <TouchableOpacity key={c} onPress={() => setCategory(c)}
                      style={[s.catChip, { backgroundColor: category === c ? '#550a19' : '#f9f4f5', borderColor: category === c ? '#550a19' : '#e8d5d9' }]}>
                      <Text style={[s.catChipText, { color: category === c ? '#f5e0e5' : '#a07080' }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={t.stockQty}>
                <TextInput style={s.input} value={qty} onChangeText={setQty} keyboardType="numeric" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t.laborCost}>
                <TextInput style={s.input} value={laborCost} onChangeText={setLaborCost} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
              </Field>
            </View>
          </View>
        </Sec>

        {/* METAL */}
        <Sec>
          <SecHead icon="layers">{t.metalSection}</SecHead>
          <View style={s.metalTabs}>
            {METAL_TABS.map((tb, i) => {
              const active = metalKey === tb.key;
              return (
                <TouchableOpacity key={tb.key} onPress={() => { setMetalKey(tb.key); setMetalWeight(''); }}
                  style={[s.metalTab, { backgroundColor: active ? tb.col : '#fff', borderRightWidth: i < METAL_TABS.length - 1 ? 0.5 : 0, borderRightColor: '#e8d5d9' }]}>
                  <Text style={[s.metalTabText, { color: active ? '#fff' : tb.col }]}>{tb.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[s.metalBox, { backgroundColor: tab.bg, borderColor: tab.border }]}>
            <Field label={isGold ? t.goldPriceLabel : t.silverPriceLabel}>
              <TextInput style={[s.input, { borderColor: tab.border }]}
                value={isGold ? goldPrice : silverPrice}
                onChangeText={isGold ? setGoldPrice : setSilverPrice}
                keyboardType="numeric" />
            </Field>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label={t.actualWeight}>
                  <TextInput style={[s.input, { borderColor: tab.border }]} value={metalWeight} onChangeText={setMetalWeight} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#c0a0a8" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t.adjWeight}>
                  <View style={[s.input, { backgroundColor: '#f0fdf4', borderColor: '#a8d8b0', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#1a5c28' }}>{wNum > 0 ? wAdj.toFixed(2) : '—'} g</Text>
                  </View>
                </Field>
              </View>
            </View>
            <View style={[s.costBox, { backgroundColor: tab.bg, borderColor: tab.border }]}>
              <Text style={[s.costBoxLabel, { color: tab.col }]}>{isGold ? `ต้นทุนทอง ${metalKey}` : 'ต้นทุนเงิน 925'}</Text>
              <Text style={[s.costBoxValue, { color: tab.col }]}>฿{fmt(metalCost)}</Text>
            </View>
          </View>
        </Sec>

        {/* DIAMONDS */}
        <Sec>
          <SecHead icon="diamond-outline" col="#534AB7">{t.diamondSection}</SecHead>
          {diamonds.map((d, idx) => (
            <View key={d.id} style={s.diamondBox}>
              <View style={s.diamondHeader}>
                <Text style={s.diamondTitle}>{lang === 'th' ? `เพชรเม็ดที่ ${idx + 1}` : `Diamond #${idx + 1}`} {idx === 0 ? '(หลัก)' : '(ข้าง)'}</Text>
                {idx > 0 && (
                  <TouchableOpacity onPress={() => setDiamonds(ds => ds.filter(x => x.id !== d.id))} style={s.removeBtn}>
                    <MaterialCommunityIcons name="close" size={sc(10)} color="#550a19" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field label={t.dWeight}>
                    <TextInput style={[s.input, s.dInput]} value={d.weight} onChangeText={v => updD(d.id, 'weight', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#c0a0a8" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={t.dQty}>
                    <TextInput style={[s.input, s.dInput]} value={d.qty} onChangeText={v => updD(d.id, 'qty', v)} keyboardType="numeric" />
                  </Field>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[['dShape', SHAPES], ['dColor', COLORS], ['dClarity', CLARITY]].map(([field, opts]) => (
                  <View key={field} style={{ flex: 1 }}>
                    <Field label={t[field]}>
                      <TouchableOpacity onPress={() => openDropdown(d.id, field, opts)}
                        style={[s.input, s.dInput, { justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 11, color: d[field.replace('d', '').toLowerCase()] ? '#2c1015' : '#c0a0a8' }} numberOfLines={1}>
                          {d[field === 'dShape' ? 'shape' : field === 'dColor' ? 'color' : 'clarity'] || t.selectPh}
                        </Text>
                      </TouchableOpacity>
                    </Field>
                  </View>
                ))}
              </View>
              <View style={[s.certRow]}>
                <Toggle on={d.hasCert} onChange={v => updD(d.id, 'hasCert', v)} />
                <Text style={[s.toggleLabel, { color: d.hasCert ? '#550a19' : '#a07080' }]}>{d.hasCert ? t.hasCert : t.noCert}</Text>
              </View>
              {d.hasCert && (
                <View style={s.certBox}>
                  <View style={s.certLabRow}>
                    {['IGI','GIA'].map((lab, i) => (
                      <TouchableOpacity key={lab} onPress={() => updD(d.id, 'certLab', lab)}
                        style={[s.certLabBtn, { backgroundColor: d.certLab === lab ? '#534AB7' : '#fff', borderRightWidth: i === 0 ? 0.5 : 0, borderRightColor: '#d4c8f0' }]}>
                        <Text style={[s.certLabText, { color: d.certLab === lab ? '#fff' : '#534AB7' }]}>{lab}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Field label={t.reportNo}>
                    <TextInput style={[s.input, s.dInput]} value={d.certNo} onChangeText={v => updD(d.id, 'certNo', v)} placeholder="e.g. 2486901234" placeholderTextColor="#c0a0a8" />
                  </Field>
                </View>
              )}
              <Field label={t.dCost}>
                <TextInput style={[s.input, s.dInput]} value={d.cost} onChangeText={v => updD(d.id, 'cost', v)} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
              </Field>
            </View>
          ))}
          <TouchableOpacity onPress={() => setDiamonds(ds => [...ds, initD()])} style={s.addDiamondBtn}>
            <MaterialCommunityIcons name="plus" size={sc(14)} color="#534AB7" />
            <Text style={s.addDiamondText}>{t.addDiamond}</Text>
          </TouchableOpacity>
        </Sec>

        {/* SUMMARY */}
        <Sec>
          <SecHead icon="currency-usd">{t.summarySection}</SecHead>
          {[
            [lang === 'th' ? `ต้นทุนโลหะ (${metalKey})` : `Metal Cost (${metalKey})`, metalCost],
            [lang === 'th' ? 'ต้นทุนเพชรรวม' : 'Total Diamond Cost', dTotalCost],
            [lang === 'th' ? 'ค่าแรงช่าง' : 'Labor Cost', parseFloat(laborCost) || 0],
          ].map(([l, v]) => (
            <View key={l} style={s.priceRow}><Text style={s.priceLabel}>{l}</Text><Text style={s.priceVal}>฿{fmt(v)}</Text></View>
          ))}
          <View style={[s.priceRow, { borderTopWidth: 0.5, borderTopColor: '#e8d5d9', marginTop: 8, paddingTop: 8 }]}>
            <Text style={s.totalLabel}>{t.totalCost}</Text>
            <Text style={s.totalVal}>฿{fmt(totalCost)}</Text>
          </View>
          <View style={s.sellingBox}>
            <Text style={s.fieldLabel}>{t.sellingPrice}</Text>
            <TextInput style={s.input} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
            {sellingPrice && totalCost > 0 && (
              <View style={s.profitRow}>
                <Text style={s.profitLabel}>{t.profit}</Text>
                <Text style={[s.profitVal, { color: parseFloat(sellingPrice) >= totalCost ? '#2e7d32' : '#c62828' }]}>
                  ฿{fmt(parseFloat(sellingPrice) - totalCost)} ({((parseFloat(sellingPrice) - totalCost) / totalCost * 100).toFixed(1)}%)
                </Text>
              </View>
            )}
          </View>
        </Sec>

        {/* SAVE BUTTON */}
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[s.saveBtn, { opacity: saving ? 0.7 : 1 }]}>
          {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={sc(18)} color="#fff5f7" />}
          <Text style={s.saveBtnText}>{saving ? t.saving : t.saveBtn(skuLabel)}</Text>
        </TouchableOpacity>

        {/* CURRENT STOCK */}
        <Sec>
          <SecHead icon="view-list">{t.currentStock} {!loadingList && `(${stockList.length})`}</SecHead>
          {stockList.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => printStock(stockList)} style={s.toolBtn}>
                <MaterialCommunityIcons name="printer" size={sc(15)} color="#550a19" />
                <Text style={s.toolBtnText}>{lang === 'th' ? 'ปริ้น / บันทึก PDF' : 'Print / Save PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTagOpen(true)} style={[s.toolBtn, { backgroundColor: '#f0eeff', borderColor: '#c8c0f0' }]}>
                <MaterialCommunityIcons name="tag-multiple" size={sc(15)} color="#534AB7" />
                <Text style={[s.toolBtnText, { color: '#534AB7' }]}>
                  {lang === 'th' ? 'พิมพ์ป้ายสินค้า' : 'Print tags'}{tagCount ? ` (${tagCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {loadingList && <ActivityIndicator color="#550a19" />}
          {!!qtyErr && (
            <View style={s.qtyErrBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={sc(14)} color="#a32d2d" />
              <Text style={s.qtyErrText}>{qtyErr}</Text>
            </View>
          )}
          {stockList.slice(0, 8).map(p => {
            const n   = tagSel[p.id] || 0;
            const qty = parseInt(p.stock_qty, 10) || 0;
            return (
              <View key={p.id} style={s.stockItem}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.stockName} numberOfLines={1}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={s.stockSku}>{p.sku}</Text>
                    {p.is_available === false && (
                      <View style={s.offBadge}><Text style={s.offBadgeText}>ปิดขาย</Text></View>
                    )}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text style={s.stockPrice}>฿{fmt(p.sale_price)}</Text>
                  {/* ปรับจำนวนคงเหลือ */}
                  <View style={s.qtyRow}>
                    <TouchableOpacity onPress={() => bumpQty(p, -1)} disabled={qty <= 0}
                      style={[s.qtyBtn, qty <= 0 && { opacity: 0.35 }]}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="minus" size={sc(13)} color="#550a19" />
                    </TouchableOpacity>
                    <View style={s.qtyValWrap}>
                      <TextInput
                        style={[s.qtyVal, qty === 0 && { color: '#c62828' }]}
                        value={qtyEdit[p.id] ?? String(qty)}
                        onChangeText={(v) => {
                          const clean = v.replace(/[^0-9]/g, '').slice(0, 4);
                          setQtyEdit(e => ({ ...e, [p.id]: clean }));
                          if (clean !== '') setQtyAbs(p, clean);
                        }}
                        onBlur={() => setQtyEdit(e => { const n = { ...e }; delete n[p.id]; return n; })}
                        keyboardType="number-pad"
                        selectTextOnFocus
                        textAlign="center"
                      />
                      {qtySaving[p.id] && <View style={s.qtyDot} />}
                    </View>
                    <TouchableOpacity onPress={() => bumpQty(p, 1)} style={s.qtyBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="plus" size={sc(13)} color="#550a19" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity onPress={() => addTag(p.id)} activeOpacity={0.7}
                  style={[s.rowAddBtn, n > 0 && s.rowAddBtnOn]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                  <MaterialCommunityIcons name={n > 0 ? 'tag' : 'tag-plus-outline'} size={sc(15)}
                    color={n > 0 ? '#fff' : '#534AB7'} />
                  {n > 0 && <Text style={s.rowAddCount}>{n}</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
          {stockList.length > 8 && (
            <TouchableOpacity onPress={() => setTagOpen(true)} style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 11, color: '#534AB7', fontWeight: '500' }}>
                {lang === 'th'
                  ? `+ ดูสินค้าทั้งหมด ${stockList.length} รายการ (เลือกพิมพ์ป้าย)`
                  : `+ View all ${stockList.length} items (choose tags)`}
              </Text>
            </TouchableOpacity>
          )}
        </Sec>

        <View style={{ height: tagCount > 0 ? 76 : 20 }} />
      </ScrollView>

      {/* PRINT TAG MODAL — เลือกสินค้า + จำนวนดวง */}
      <Modal visible={tagOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTagOpen(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{lang === 'th' ? 'พิมพ์ป้ายสินค้า' : 'Print product tags'}</Text>
            <TouchableOpacity onPress={() => setTagOpen(false)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>

          <View style={s.tagHint}>
            <MaterialCommunityIcons name="information-outline" size={sc(14)} color="#534AB7" />
            <Text style={s.tagHintText}>
              {lang === 'th'
                ? 'ป้ายขนาด 50 × 15 มม. — ตั้งขนาดกระดาษใน driver เครื่องพิมพ์เป็น 50×15 มม. ก่อนสั่งพิมพ์'
                : 'Tag size 50 × 15 mm — set the printer driver paper size to 50×15 mm first'}
            </Text>
          </View>

          <View style={s.tagBulkRow}>
            <TouchableOpacity onPress={() => { const a = {}; stockList.forEach(p => { a[p.id] = 1; }); setTagSel(a); }} style={s.tagBulkBtn}>
              <Text style={s.tagBulkText}>{lang === 'th' ? 'เลือกทั้งหมด' : 'Select all'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTagSel({})} style={s.tagBulkBtn}>
              <Text style={s.tagBulkText}>{lang === 'th' ? 'ล้างทั้งหมด' : 'Clear all'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { const a = {}; stockList.forEach(p => { const q = parseInt(p.stock_qty, 10) || 1; if (q > 0) a[p.id] = Math.min(99, q); }); setTagSel(a); }} style={s.tagBulkBtn}>
              <Text style={s.tagBulkText}>{lang === 'th' ? 'ตามจำนวนคงเหลือ' : 'Match stock qty'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {stockList.map(p => {
              const n = tagSel[p.id] || 0;
              return (
                <View key={p.id} style={s.tagRow}>
                  <TouchableOpacity onPress={() => setCopies(p.id, n > 0 ? 0 : 1)} style={s.tagCheck}>
                    <MaterialCommunityIcons
                      name={n > 0 ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={sc(20)} color={n > 0 ? '#534AB7' : '#c0b8d8'} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.stockName} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.stockSku}>{p.sku} · ฿{fmt(p.sale_price)}</Text>
                  </View>
                  <View style={s.stepper}>
                    <TouchableOpacity onPress={() => setCopies(p.id, n - 1)} style={s.stepBtn}>
                      <MaterialCommunityIcons name="minus" size={sc(14)} color="#534AB7" />
                    </TouchableOpacity>
                    <TextInput
                      style={s.stepVal}
                      value={String(n)}
                      onChangeText={(v) => setCopies(p.id, parseInt(v.replace(/[^0-9]/g, '').slice(0, 2), 10) || 0)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      textAlign="center"
                    />
                    <TouchableOpacity onPress={() => setCopies(p.id, n + 1)} style={s.stepBtn}>
                      <MaterialCommunityIcons name="plus" size={sc(14)} color="#534AB7" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <View style={{ height: 12 }} />
          </ScrollView>

          <View style={s.tagFooter}>
            <Text style={s.tagTotal}>
              {lang === 'th' ? `รวม ${tagCount} ดวง` : `${tagCount} tag${tagCount === 1 ? '' : 's'}`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity disabled={!tagCount} onPress={() => saveTags(tagItems)}
                style={[s.tagActionBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#534AB7', opacity: tagCount ? 1 : 0.4 }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={sc(16)} color="#534AB7" />
                <Text style={[s.tagActionText, { color: '#534AB7' }]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!tagCount} onPress={() => printTags(tagItems)}
                style={[s.tagActionBtn, { backgroundColor: '#534AB7', opacity: tagCount ? 1 : 0.4 }]}>
                <MaterialCommunityIcons name="printer" size={sc(16)} color="#fff" />
                <Text style={[s.tagActionText, { color: '#fff' }]}>{lang === 'th' ? 'สั่งพิมพ์' : 'Print'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PHOTO MENU MODAL */}
      <Modal visible={photoMenuOpen} transparent animationType="slide">
        <TouchableOpacity style={s.bottomSheetOverlay} onPress={() => setPhotoMenuOpen(false)} activeOpacity={1}>
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <TouchableOpacity onPress={() => pickPhoto(true)} style={s.sheetBtn}>
              <MaterialCommunityIcons name="camera" size={sc(18)} color="#550a19" />
              <Text style={s.sheetBtnText}>{t.photoTakeNew}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickPhoto(false)} style={s.sheetBtn}>
              <MaterialCommunityIcons name="image" size={sc(18)} color="#550a19" />
              <Text style={s.sheetBtnText}>{t.photoGallery}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DROPDOWN MODAL */}
      <Modal visible={!!dropdownTarget} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{dropdownTarget ? t[dropdownTarget.field] : ''}</Text>
            <TouchableOpacity onPress={() => setDropdownTarget(null)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <TextInput style={s.modalSearch} value={dropdownQuery} onChangeText={setDropdownQuery} placeholder="ค้นหา..." placeholderTextColor="#b08090" autoFocus />
          <FlatList
            data={filteredDropdown}
            keyExtractor={item => item}
            renderItem={({ item }) => {
              const field = dropdownTarget?.field;
              const dKey  = field === 'dShape' ? 'shape' : field === 'dColor' ? 'color' : 'clarity';
              const dId   = dropdownTarget?.diamondId;
              const cur   = diamonds.find(d => d.id === dId)?.[dKey];
              return (
                <TouchableOpacity
                  onPress={() => { updD(dId, dKey, item); setDropdownTarget(null); }}
                  style={[s.stockRow, { backgroundColor: cur === item ? '#550a19' : 'transparent' }]}>
                  <Text style={[{ fontSize: 14 }, { color: cur === item ? '#fff' : '#2c1015' }]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* แถบลอย — ป้ายที่รอพิมพ์ (โผล่เมื่อมีของในคิว) */}
      {tagCount > 0 && !tagOpen && (
        <View style={[s.tagBar, { bottom: insets.bottom + 12 }]}>
          <TouchableOpacity onPress={() => setTagOpen(true)} style={s.tagBarInfo} activeOpacity={0.7}>
            <MaterialCommunityIcons name="tag-multiple" size={sc(17)} color="#fff" />
            <Text style={s.tagBarText}>
              {lang === 'th' ? `ป้ายรอพิมพ์ ${tagCount} ดวง` : `${tagCount} tag${tagCount === 1 ? '' : 's'} queued`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTagSel({})} style={s.tagBarIcon} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <MaterialCommunityIcons name="close" size={sc(16)} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => printTags(tagItems)} style={s.tagBarPrint} activeOpacity={0.8}>
            <MaterialCommunityIcons name="printer" size={sc(15)} color="#534AB7" />
            <Text style={s.tagBarPrintText}>{lang === 'th' ? 'พิมพ์' : 'Print'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const baseStyles = {
  content: { padding: 14, paddingBottom: 30 },
  errBox:  { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#a32d2d' },
  okBox:   { backgroundColor: '#e8f5e9', borderWidth: 0.5, borderColor: '#a8d8b0', borderRadius: 8, padding: 10, marginBottom: 10 },
  okText:  { fontSize: 12, color: '#1a5c28' },
  sec:     { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e8d5d9', padding: 12, marginBottom: 10 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  secHeadText: { fontSize: 11, fontWeight: '500', letterSpacing: 1.5 },
  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 3 },
  input: { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: '500', color: '#2c1015' },
  skuRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skuPrefix: { backgroundColor: '#550a19', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  skuPrefixText: { fontSize: 12, fontWeight: '500', color: '#f5e0e5' },
  skuNum: { flex: 1, fontSize: 16, fontWeight: '500', color: '#550a19', textAlign: 'center' },
  skuBtn: { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  skuBtnPlus: { backgroundColor: '#fdf0f2' },
  skuBtnText: { fontSize: 12, color: '#a07080' },
  photo: { width: '100%', height: 160, borderRadius: 10, borderWidth: 0.5, borderColor: '#e8d5d9' },
  photoOverlay: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  photoBtn: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 7, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholder: { backgroundColor: '#f9f4f5', borderRadius: 10, borderWidth: 0.5, borderStyle: 'dashed', borderColor: '#c8a0ac', height: 72, justifyContent: 'center', alignItems: 'center', gap: 6, flexDirection: 'row' },
  photoHint: { fontSize: 12, color: '#b08090' },
  catChip: { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  catChipText: { fontSize: 11 },
  metalTabs: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e8d5d9', marginBottom: 12 },
  metalTab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  metalTabText: { fontSize: 13, fontWeight: '500' },
  metalBox: { borderRadius: 10, borderWidth: 0.5, padding: 12 },
  costBox: { borderRadius: 10, borderWidth: 0.5, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costBoxLabel: { fontSize: 12, fontWeight: '500' },
  costBoxValue: { fontSize: 16, fontWeight: '500' },
  diamondBox: { backgroundColor: '#f8f4ff', borderRadius: 10, borderWidth: 0.5, borderColor: '#d4c8f0', padding: 10, marginBottom: 8 },
  diamondHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  diamondTitle: { fontSize: 10, fontWeight: '500', color: '#534AB7', letterSpacing: 1 },
  dInput: { backgroundColor: '#fdf0f2', borderColor: '#d4c8f0' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  toggle: { width: 36, height: 20, borderRadius: 10, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleLabel: { fontSize: 12, fontWeight: '500' },
  certBox: { backgroundColor: '#fdf8ff', borderRadius: 10, borderWidth: 0.5, borderColor: '#d4c8f0', padding: 10, marginBottom: 8 },
  certLabRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 0.5, borderColor: '#d4c8f0', marginBottom: 8 },
  certLabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  certLabText: { fontSize: 13, fontWeight: '500' },
  removeBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', justifyContent: 'center', alignItems: 'center' },
  addDiamondBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: '#d4c8f0', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f8f4ff' },
  addDiamondText: { fontSize: 12, color: '#534AB7' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { fontSize: 13, color: '#806070' },
  priceVal:   { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  totalLabel: { fontSize: 13, fontWeight: '500', color: '#550a19' },
  totalVal:   { fontSize: 16, fontWeight: '500', color: '#550a19' },
  sellingBox: { backgroundColor: '#f9f4f5', borderRadius: 8, padding: 10, marginTop: 8 },
  profitRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  profitLabel:{ fontSize: 12, color: '#608050' },
  profitVal:  { fontSize: 12, fontWeight: '500' },
  saveBtn: { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  saveBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  stockItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  stockName: { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  stockSku:  { fontSize: 10, color: '#a07080' },
  stockPrice:{ fontSize: 13, fontWeight: '500', color: '#550a19' },
  offBadge:    { backgroundColor: '#f0e4e8', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  offBadgeText:{ fontSize: 9, fontWeight: '600', color: '#9a6b78' },
  qtyRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f4f5', borderRadius: 8, borderWidth: 0.5, borderColor: '#e8d5d9' },
  qtyBtn:      { paddingHorizontal: 7, paddingVertical: 5 },
  qtyValWrap:  { alignItems: 'center', justifyContent: 'center' },
  qtyVal:      { minWidth: 34, paddingVertical: 4, fontSize: 12.5, fontWeight: '700', color: '#2c1015', textAlign: 'center' },
  qtyDot:      { position: 'absolute', top: -1, right: -1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#e0a020' },
  qtyErrBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  qtyErrText:  { flex: 1, fontSize: 11, color: '#a32d2d' },
  rowAddBtn:   { marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f0eeff', borderWidth: 0.5, borderColor: '#d8d0f5', minWidth: 30, justifyContent: 'center' },
  rowAddBtnOn: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  rowAddCount: { fontSize: 11, fontWeight: '700', color: '#fff' },
  tagBar:      { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#534AB7', borderRadius: 14, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  tagBarInfo:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagBarText:  { fontSize: 13, fontWeight: '600', color: '#fff' },
  tagBarIcon:  { padding: 4 },
  tagBarPrint: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  tagBarPrintText: { fontSize: 13, fontWeight: '700', color: '#534AB7' },
  toolBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  toolBtnText: { fontSize: 12, color: '#550a19', fontWeight: '500' },
  tagHint:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f0eeff', borderRadius: 8, padding: 10, marginBottom: 10 },
  tagHintText: { flex: 1, fontSize: 10.5, color: '#534AB7', lineHeight: 15 },
  tagBulkRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tagBulkBtn: { borderWidth: 0.5, borderColor: '#c8c0f0', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  tagBulkText:{ fontSize: 10.5, color: '#534AB7', fontWeight: '500' },
  tagRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  tagCheck:  { padding: 2 },
  stepper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6f5ff', borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd8f5' },
  stepBtn:   { paddingHorizontal: 8, paddingVertical: 6 },
  stepVal:   { minWidth: 32, paddingVertical: 4, textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: '#2c1015' },
  tagFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 0.5, borderTopColor: '#e8d5d9', paddingTop: 12, paddingBottom: 4 },
  tagTotal:  { fontSize: 12, fontWeight: '600', color: '#2c1015' },
  tagActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  tagActionText:{ fontSize: 13, fontWeight: '600' },
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14, paddingBottom: 30 },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#e8d5d9', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  sheetBtnText: { fontSize: 13, color: '#2c1015' },
  modal: { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  modalSearch: { backgroundColor: '#f9f4f5', borderWidth: 0.5, borderColor: '#e8d5d9', borderRadius: 10, padding: 10, fontSize: 14, color: '#2c1015', marginBottom: 10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
};
