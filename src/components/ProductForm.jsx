// ══════════════════════════════════════════════════════
// ProductForm.jsx — ฟอร์มข้อมูลสินค้า (ใช้ร่วมกัน 2 ที่)
//   mode="create" → หน้า "เพิ่มสต๊อกสินค้า" (StockScreen)
//   mode="edit"   → โมดัลแก้ไขในหน้า "สต๊อกสินค้า" (InventoryScreen)
// ฟิลด์เหมือนกันทุกช่อง รวมถึงคำนวณต้นทุนโลหะ/เพชรใหม่ทุกครั้งที่แก้
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Modal, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScaledStyles } from '../responsive';

const GOLD_BAHT_GRAMS = 15.244;
const GOLD_OPTIONS = [
  { key: '9K',  factor: 0.50 },
  { key: '14K', factor: 0.75 },
  { key: '18K', factor: 0.90 },
];
export const METAL_TABS = [
  { key: '9K',     label: '9K',     col: '#550a19', bg: '#fdf0f2', border: '#e8c0c8' },
  { key: '14K',    label: '14K',    col: '#550a19', bg: '#fdf0f2', border: '#e8c0c8' },
  { key: '18K',    label: '18K',    col: '#550a19', bg: '#fdf0f2', border: '#e8c0c8' },
  { key: 'silver', label: 'Silver', col: '#550a19', bg: '#fdf0f2', border: '#e8c0c8' },
];
const SHAPES = [
  'Round Brilliant','Princess Cut','Cushion Cut','Emerald Cut','Asscher Cut',
  'Radiant Cut','Oval Cut','Pear Cut','Marquise Cut','Heart Cut',
  'Elongated Cushion Cut','Baguette Cut','Old Mine Cut','Old European Cut','Rose Cut',
  'Trillion Cut','Kite Cut','Shield Cut','Hexagon Cut',
];
const COLORS  = ['D','E','F','G','H','I','J','K','L','M','Fancy Yellow','Fancy Pink','Fancy Blue','Fancy Green'];
const CLARITY = ['FL','IF','VVS1','VVS2','VS1','VS2','SI1','SI2','I1','I2','I3'];

// รหัสหมวดหมู่ที่เก็บใน database — ลำดับตรงกับ T[lang].categories
export const CAT_CODES = ['ring','necklace','earring','bracelet','pendant','other'];

export const T = {
  th: {
    skuSection: 'รหัสสินค้า (SKU)', skuEditLabel: 'รหัสสินค้า',
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
    updateBtn: 'บันทึกการแก้ไข',
    saving: 'กำลังบันทึก...',
    saveSuccess: 'บันทึกสินค้าเรียบร้อย ✓',
    updateSuccess: 'บันทึกการแก้ไขเรียบร้อย ✓',
    needName: 'กรุณากรอกชื่อสินค้าและราคาขาย',
    needSku: 'กรุณากรอกรหัสสินค้า (SKU)',
    categories: ['แหวน','สร้อยคอ','ต่างหู','กำไล','จี้','อื่นๆ'],
    selectPh: 'เลือก...',
    search: 'ค้นหา...',
  },
  en: {
    skuSection: 'Product Code (SKU)', skuEditLabel: 'Product Code',
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
    updateBtn: 'Save changes',
    saving: 'Saving...',
    saveSuccess: 'Saved successfully ✓',
    updateSuccess: 'Changes saved ✓',
    needName: 'Please fill name and selling price',
    needSku: 'Please fill the product code (SKU)',
    categories: ['Ring','Necklace','Earring','Bracelet','Pendant','Other'],
    selectPh: 'Select...',
    search: 'Search...',
  },
};

const fmt = (n) => {
  const num = Number(n);
  return Math.round(Number.isFinite(num) ? num : 0).toLocaleString('th-TH');
};
const newDiamond = () => ({
  id: Date.now() + Math.random(), weight: '', qty: '1', shape: '', color: '',
  clarity: '', hasCert: false, certLab: 'GIA', certNo: '', cost: '',
});

// แปลงเพชรจาก database (JSONB array หรือ string) → state ของฟอร์ม
function parseDiamonds(raw) {
  let list = raw;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch (_) { list = []; } }
  if (!Array.isArray(list) || list.length === 0) return [newDiamond()];
  return list.map((d, i) => ({
    id: Date.now() + i + Math.random(),
    weight:  d?.weight  != null ? String(d.weight)  : '',
    qty:     d?.qty     != null ? String(d.qty)     : '1',
    shape:   d?.shape   || '',
    color:   d?.color   || '',
    clarity: d?.clarity || '',
    hasCert: !!d?.hasCert,
    certLab: d?.certLab || 'GIA',
    certNo:  d?.certNo  || '',
    cost:    d?.cost    != null ? String(d.cost)    : '',
  }));
}

const str = (v) => (v == null ? '' : String(v));

function Field({ label, children }) {
  const { styles: s } = useScaledStyles(baseStyles);
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>{children}</View>;
}
function Sec({ children }) {
  const { styles: s } = useScaledStyles(baseStyles);
  return <View style={s.sec}>{children}</View>;
}
function SecHead({ icon, children, col = '#550a19' }) {
  const { styles: s, sc } = useScaledStyles(baseStyles);
  return (
    <View style={s.secHead}>
      <MaterialCommunityIcons name={icon} size={sc(14)} color={col} />
      <Text style={[s.secHeadText, { color: col }]}>{children}</Text>
    </View>
  );
}
function Toggle({ on, onChange }) {
  const { styles: s } = useScaledStyles(baseStyles);
  return (
    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => onChange(!on)} style={[s.toggle, { backgroundColor: on ? '#550a19' : '#e0d8da' }]}>
      <View style={[s.toggleKnob, { left: on ? 18 : 2 }]} />
    </TouchableOpacity>
  );
}

/**
 * mode        'create' | 'edit'
 * lang        'th' | 'en'
 * product     สินค้าที่จะแก้ (เฉพาะ mode="edit")
 * nextSkuNum  เลข SKU ถัดไป (เฉพาะ mode="create")
 * stockCount  จำนวนสินค้าในสต๊อก ใช้กับปุ่ม Reset ของ SKU
 * onSubmit    async (payload) => saved — โยน error ออกมาได้เลย ฟอร์มจะโชว์ให้
 */
export default function ProductForm({
  mode = 'create', lang = 'th', product = null,
  nextSkuNum = 1, stockCount = 0, onSubmit,
}) {
  const { styles: s, sc } = useScaledStyles(baseStyles);
  const t = T[lang];
  const isEdit = mode === 'edit';

  const [skuNum, setSkuNum] = useState(nextSkuNum);
  const [sku, setSku]       = useState('');
  const [photoUri, setPhotoUri]   = useState(null);
  const [photoOrig, setPhotoOrig] = useState(null);   // รูปเดิมจาก database — ใช้เช็คว่าเปลี่ยนรูปหรือยัง
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const [goldPrice, setGoldPrice]     = useState('67300');
  const [silverPrice, setSilverPrice] = useState('33.50');
  const [metalKey, setMetalKey]       = useState('18K');
  const [metalWeight, setMetalWeight] = useState('');
  const [laborCost, setLaborCost]     = useState('');
  const [itemName, setItemName]       = useState('');
  const [catCode, setCatCode]         = useState(CAT_CODES[0]);
  const [qty, setQty]                 = useState('1');
  const [diamonds, setDiamonds]       = useState([newDiamond()]);
  const [sellingPrice, setSellingPrice] = useState('');

  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [dropdownTarget, setDropdownTarget] = useState(null); // { diamondId, field, options }
  const [dropdownQuery, setDropdownQuery]   = useState('');

  // create: เลข SKU วิ่งตามหน้าแม่
  useEffect(() => { if (!isEdit) setSkuNum(nextSkuNum); }, [nextSkuNum, isEdit]);

  // edit: เติมค่าจากสินค้าที่เลือก ทุกครั้งที่เปลี่ยนตัว
  useEffect(() => {
    if (!isEdit || !product) return;
    setSku(str(product.sku));
    setPhotoUri(product.photo_url || null);
    setPhotoOrig(product.photo_url || null);
    setItemName(str(product.name));
    setCatCode(CAT_CODES.includes(product.category) ? product.category : 'other');
    setQty(str(product.stock_qty ?? 0));
    setLaborCost(product.labor_cost ? str(product.labor_cost) : '');
    setMetalKey(METAL_TABS.some(m => m.key === product.metal_type) ? product.metal_type : '18K');
    setMetalWeight(product.metal_weight_g ? str(product.metal_weight_g) : '');
    if (product.gold_price_at_creation)   setGoldPrice(str(product.gold_price_at_creation));
    if (product.silver_price_at_creation) setSilverPrice(str(product.silver_price_at_creation));
    setDiamonds(parseDiamonds(product.diamonds));
    setSellingPrice(product.sale_price != null ? str(product.sale_price) : '');
    setSaveError(''); setSaveSuccess(false);
  }, [isEdit, product?.id]);

  const isGold   = metalKey !== 'silver';
  const isSilver = metalKey === 'silver';
  const tab      = METAL_TABS.find(m => m.key === metalKey) || METAL_TABS[2];
  const goldOpt  = GOLD_OPTIONS.find(o => o.key === metalKey) || GOLD_OPTIONS[2];

  const wNum       = parseFloat(metalWeight) || 0;
  const wAdj       = wNum * 1.1;
  const gpg        = (parseFloat(goldPrice) || 0) / GOLD_BAHT_GRAMS;
  const goldCost   = isGold   ? Math.round(wAdj * gpg * goldOpt.factor) : 0;
  const silvCost   = isSilver ? Math.round(wAdj * (parseFloat(silverPrice) || 0)) : 0;
  const metalCost  = isGold ? goldCost : silvCost;
  const dTotalCost = diamonds.reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0);
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

  const toBase64 = async (uri) => {
    const data = await fetch(uri);
    const blob = await data.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const resetForm = () => {
    setItemName(''); setMetalWeight(''); setLaborCost(''); setSellingPrice('');
    setDiamonds([newDiamond()]); setQty('1'); setPhotoUri(null); setPhotoOrig(null);
  };

  const handleSave = async () => {
    if (!itemName.trim() || !sellingPrice) { setSaveError(t.needName); return; }
    if (isEdit && !sku.trim())             { setSaveError(t.needSku);  return; }

    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      // รูป: ส่งเฉพาะตอนที่เปลี่ยนจริง (base64 ก้อนใหญ่ ไม่ต้องส่งซ้ำทุกครั้งที่แก้แค่ข้อความ)
      let photoField;                                   // undefined = ไม่แตะคอลัมน์นี้
      if (photoUri !== photoOrig) {
        if (!photoUri) photoField = null;               // ผู้ใช้ลบรูปทิ้ง
        else if (photoUri.startsWith('data:')) photoField = photoUri;
        else photoField = await toBase64(photoUri);
      }

      const dList = diamonds.filter(d => d.weight || d.cost).map(d => ({
        weight: parseFloat(d.weight) || 0, qty: parseInt(d.qty, 10) || 1,
        shape: d.shape, color: d.color, clarity: d.clarity,
        hasCert: d.hasCert, certLab: d.certLab, certNo: d.certNo,
        cost: parseFloat(d.cost) || 0,
      }));

      const payload = {
        sku: isEdit ? sku.trim() : skuLabel,
        name: itemName.trim(),
        category: catCode,
        metal_type: metalKey,
        metal_weight_g: wNum || null,
        metal_weight_adj_g: wNum > 0 ? wAdj : null,
        gold_price_at_creation:   isGold   ? parseFloat(goldPrice)   : null,
        silver_price_at_creation: isSilver ? parseFloat(silverPrice) : null,
        metal_cost: metalCost,
        labor_cost: parseFloat(laborCost) || 0,
        // POST: backend stringify ให้เอง — PUT: เขียนลงคอลัมน์ JSONB ตรง ๆ จึงต้อง stringify ที่นี่
        diamonds: isEdit ? JSON.stringify(dList) : dList,
        diamond_total_cost: dTotalCost,
        has_certificate: diamonds.some(d => d.hasCert),
        certificate_no: diamonds[0]?.certNo || null,
        cost_price: totalCost,
        sale_price: parseFloat(sellingPrice) || 0,
        stock_qty: parseInt(qty, 10) || 0,
      };
      if (photoField !== undefined) payload.photo_url = photoField;

      await onSubmit?.(payload);
      setSaveSuccess(true);
      if (isEdit) setPhotoOrig(photoUri);
      else { setSkuNum(n => n + 1); resetForm(); }
    } catch (err) {
      setSaveError(err?.message || (lang === 'th' ? 'ไม่สามารถบันทึกสินค้าได้' : 'Failed to save product'));
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
    <>
      {!!saveError && <View style={s.errBox}><Text style={s.errText}>{saveError}</Text></View>}
      {saveSuccess && <View style={s.okBox}><Text style={s.okText}>{isEdit ? t.updateSuccess : t.saveSuccess}</Text></View>}

      {/* SKU */}
      <Sec>
        <SecHead icon="barcode">{isEdit ? t.skuEditLabel : t.skuSection}</SecHead>
        {isEdit ? (
          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={sku} onChangeText={setSku}
            autoCapitalize="characters" placeholder="ANAKYN#0001" placeholderTextColor="#c0a0a8" />
        ) : (
          <View style={s.skuRow}>
            <View style={s.skuPrefix}><Text style={s.skuPrefixText}>ANAKYN</Text></View>
            <Text style={s.skuNum}>#{String(skuNum).padStart(4, '0')}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setSkuNum(n => Math.max(1, n - 1))} style={s.skuBtn}><Text style={s.skuBtnText}>−1</Text></TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setSkuNum(stockCount + 1)} style={s.skuBtn}><Text style={s.skuBtnText}>Reset</Text></TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setSkuNum(n => n + 1)} style={[s.skuBtn, s.skuBtnPlus]}><Text style={[s.skuBtnText, { color: '#550a19' }]}>+1</Text></TouchableOpacity>
          </View>
        )}
      </Sec>

      {/* PHOTO */}
      <Sec>
        <SecHead icon="camera">{t.photoSection}</SecHead>
        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={s.photo} resizeMode="cover" />
            <View style={s.photoOverlay}>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setPhotoMenuOpen(true)} style={s.photoBtn}>
                <MaterialCommunityIcons name="camera" size={sc(14)} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setPhotoUri(null)} style={s.photoBtn}>
                <MaterialCommunityIcons name="trash-can" size={sc(14)} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setPhotoMenuOpen(true)} style={s.photoPlaceholder}>
            <MaterialCommunityIcons name="camera" size={sc(24)} color="#c8a0b0" />
            <Text style={s.photoHint}>{t.photoHint}</Text>
          </TouchableOpacity>
        )}
      </Sec>

      {/* INFO */}
      <Sec>
        <SecHead icon="information">{t.infoSection}</SecHead>
        <Field label={t.itemName}>
          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={itemName} onChangeText={setItemName} placeholder={t.itemNamePh} placeholderTextColor="#c0a0a8" />
        </Field>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{t.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {CAT_CODES.map((code, i) => (
                  <TouchableOpacity dataSet={{ hov: 'btn' }} key={code} onPress={() => setCatCode(code)}
                    style={[s.catChip, { backgroundColor: catCode === code ? '#550a19' : '#f9f4f5', borderColor: catCode === code ? '#550a19' : '#e8d5d9' }]}>
                    <Text style={[s.catChipText, { color: catCode === code ? '#f5e0e5' : '#a07080' }]}>{t.categories[i]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label={t.stockQty}>
              <TextInput dataSet={{ hov: 'field' }} style={s.input} value={qty} onChangeText={setQty} keyboardType="numeric" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t.laborCost}>
              <TextInput dataSet={{ hov: 'field' }} style={s.input} value={laborCost} onChangeText={setLaborCost} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
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
              <TouchableOpacity dataSet={{ hov: 'btn' }} key={tb.key} onPress={() => { setMetalKey(tb.key); setMetalWeight(''); }}
                style={[s.metalTab, { backgroundColor: active ? tb.col : '#fff', borderRightWidth: i < METAL_TABS.length - 1 ? 0.5 : 0, borderRightColor: '#e8d5d9' }]}>
                <Text style={[s.metalTabText, { color: active ? '#fff' : tb.col }]}>{tb.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[s.metalBox, { backgroundColor: tab.bg, borderColor: tab.border }]}>
          <Field label={isGold ? t.goldPriceLabel : t.silverPriceLabel}>
            <TextInput dataSet={{ hov: 'field' }} style={[s.input, { borderColor: tab.border }]}
              value={isGold ? goldPrice : silverPrice}
              onChangeText={isGold ? setGoldPrice : setSilverPrice}
              keyboardType="numeric" />
          </Field>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={t.actualWeight}>
                <TextInput dataSet={{ hov: 'field' }} style={[s.input, { borderColor: tab.border }]} value={metalWeight} onChangeText={setMetalWeight} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#c0a0a8" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t.adjWeight}>
                <View style={[s.input, { backgroundColor: '#fdf0f2', borderColor: '#e8c0c8', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#550a19' }}>{wNum > 0 ? wAdj.toFixed(2) : '—'} g</Text>
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
        <SecHead icon="diamond-outline" col="#550a19">{t.diamondSection}</SecHead>
        {diamonds.map((d, idx) => (
          <View key={d.id} style={s.diamondBox}>
            <View style={s.diamondHeader}>
              <Text style={s.diamondTitle}>{lang === 'th' ? `เพชรเม็ดที่ ${idx + 1}` : `Diamond #${idx + 1}`} {idx === 0 ? '(หลัก)' : '(ข้าง)'}</Text>
              {idx > 0 && (
                <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setDiamonds(ds => ds.filter(x => x.id !== d.id))} style={s.removeBtn}>
                  <MaterialCommunityIcons name="close" size={sc(10)} color="#550a19" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label={t.dWeight}>
                  <TextInput dataSet={{ hov: 'field' }} style={[s.input, s.dInput]} value={d.weight} onChangeText={v => updD(d.id, 'weight', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#c0a0a8" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t.dQty}>
                  <TextInput dataSet={{ hov: 'field' }} style={[s.input, s.dInput]} value={d.qty} onChangeText={v => updD(d.id, 'qty', v)} keyboardType="numeric" />
                </Field>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['dShape', SHAPES, 'shape'], ['dColor', COLORS, 'color'], ['dClarity', CLARITY, 'clarity']].map(([field, opts, dKey]) => (
                <View key={field} style={{ flex: 1 }}>
                  <Field label={t[field]}>
                    <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => openDropdown(d.id, field, opts)}
                      style={[s.input, s.dInput, { justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 11, color: d[dKey] ? '#2c1015' : '#c0a0a8' }} numberOfLines={1}>
                        {d[dKey] || t.selectPh}
                      </Text>
                    </TouchableOpacity>
                  </Field>
                </View>
              ))}
            </View>
            <View style={s.certRow}>
              <Toggle on={d.hasCert} onChange={v => updD(d.id, 'hasCert', v)} />
              <Text style={[s.toggleLabel, { color: d.hasCert ? '#550a19' : '#a07080' }]}>{d.hasCert ? t.hasCert : t.noCert}</Text>
            </View>
            {d.hasCert && (
              <View style={s.certBox}>
                <View style={s.certLabRow}>
                  {['IGI','GIA'].map((lab, i) => (
                    <TouchableOpacity dataSet={{ hov: 'btn' }} key={lab} onPress={() => updD(d.id, 'certLab', lab)}
                      style={[s.certLabBtn, { backgroundColor: d.certLab === lab ? '#550a19' : '#fff', borderRightWidth: i === 0 ? 0.5 : 0, borderRightColor: '#ece0e3' }]}>
                      <Text style={[s.certLabText, { color: d.certLab === lab ? '#fff' : '#550a19' }]}>{lab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Field label={t.reportNo}>
                  <TextInput dataSet={{ hov: 'field' }} style={[s.input, s.dInput]} value={d.certNo} onChangeText={v => updD(d.id, 'certNo', v)} placeholder="e.g. 2486901234" placeholderTextColor="#c0a0a8" />
                </Field>
              </View>
            )}
            <Field label={t.dCost}>
              <TextInput dataSet={{ hov: 'field' }} style={[s.input, s.dInput]} value={d.cost} onChangeText={v => updD(d.id, 'cost', v)} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
            </Field>
          </View>
        ))}
        <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setDiamonds(ds => [...ds, newDiamond()])} style={s.addDiamondBtn}>
          <MaterialCommunityIcons name="plus" size={sc(14)} color="#550a19" />
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
          <TextInput dataSet={{ hov: 'field' }} style={s.input} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#c0a0a8" />
          {!!sellingPrice && totalCost > 0 && (
            <View style={s.profitRow}>
              <Text style={s.profitLabel}>{t.profit}</Text>
              <Text style={[s.profitVal, { color: parseFloat(sellingPrice) >= totalCost ? '#2e7d32' : '#c62828' }]}>
                ฿{fmt(parseFloat(sellingPrice) - totalCost)} ({((parseFloat(sellingPrice) - totalCost) / totalCost * 100).toFixed(1)}%)
              </Text>
            </View>
          )}
        </View>
      </Sec>

      {/* SAVE */}
      <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={handleSave} disabled={saving}
        style={[s.saveBtn, { opacity: saving ? 0.7 : 1 }]}>
        {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={sc(18)} color="#fff5f7" />}
        <Text style={s.saveBtnText}>{saving ? t.saving : (isEdit ? t.updateBtn : t.saveBtn(skuLabel))}</Text>
      </TouchableOpacity>

      {/* PHOTO MENU */}
      <Modal visible={photoMenuOpen} transparent animationType="slide" onRequestClose={() => setPhotoMenuOpen(false)}>
        <TouchableOpacity dataSet={{ hov: 'btn' }} style={s.bottomSheetOverlay} onPress={() => setPhotoMenuOpen(false)} activeOpacity={1}>
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => pickPhoto(true)} style={s.sheetBtn}>
              <MaterialCommunityIcons name="camera" size={sc(18)} color="#550a19" />
              <Text style={s.sheetBtnText}>{t.photoTakeNew}</Text>
            </TouchableOpacity>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => pickPhoto(false)} style={s.sheetBtn}>
              <MaterialCommunityIcons name="image" size={sc(18)} color="#550a19" />
              <Text style={s.sheetBtnText}>{t.photoGallery}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DROPDOWN (ทรง / สี / ความสะอาด) */}
      <Modal visible={!!dropdownTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDropdownTarget(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{dropdownTarget ? t[dropdownTarget.field] : ''}</Text>
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={() => setDropdownTarget(null)}>
              <MaterialCommunityIcons name="close" size={sc(22)} color="#550a19" />
            </TouchableOpacity>
          </View>
          <TextInput dataSet={{ hov: 'field' }} style={s.modalSearch} value={dropdownQuery} onChangeText={setDropdownQuery} placeholder={t.search} placeholderTextColor="#b08090" autoFocus />
          <FlatList
            data={filteredDropdown}
            keyExtractor={item => item}
            renderItem={({ item }) => {
              const field = dropdownTarget?.field;
              const dKey  = field === 'dShape' ? 'shape' : field === 'dColor' ? 'color' : 'clarity';
              const dId   = dropdownTarget?.diamondId;
              const cur   = diamonds.find(d => d.id === dId)?.[dKey];
              return (
                <TouchableOpacity dataSet={{ hov: 'btn' }}
                  onPress={() => { updD(dId, dKey, item); setDropdownTarget(null); }}
                  style={[s.stockRow, { backgroundColor: cur === item ? '#550a19' : 'transparent' }]}>
                  <Text style={[{ fontSize: 14 }, { color: cur === item ? '#fff' : '#2c1015' }]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const baseStyles = {
  errBox:  { backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#a32d2d' },
  okBox:   { backgroundColor: '#fdf0f2', borderWidth: 1, borderColor: '#f0d3da', borderRadius: 8, padding: 10, marginBottom: 10 },
  okText:  { fontSize: 12, color: '#8c1b2f' },
  sec:     { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#ece0e3', padding: 12, marginBottom: 10 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  secHeadText: { fontSize: 11, fontWeight: '500', letterSpacing: 1.5 },
  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 11, color: '#a07080', marginBottom: 3 },
  input: { backgroundColor: '#fdfbfb', borderWidth: 0.5, borderColor: '#ece0e3', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: '500', color: '#2c1015' },
  skuRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skuPrefix: { backgroundColor: '#550a19', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  skuPrefixText: { fontSize: 12, fontWeight: '500', color: '#f5e0e5' },
  skuNum: { flex: 1, fontSize: 16, fontWeight: '500', color: '#550a19', textAlign: 'center' },
  skuBtn: { backgroundColor: '#fdfbfb', borderWidth: 0.5, borderColor: '#ece0e3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  skuBtnPlus: { backgroundColor: '#fdf0f2' },
  skuBtnText: { fontSize: 12, color: '#a07080' },
  photo: { width: '100%', height: 160, borderRadius: 10, borderWidth: 0.5, borderColor: '#ece0e3' },
  photoOverlay: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  photoBtn: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 7, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholder: { backgroundColor: '#fdfbfb', borderRadius: 10, borderWidth: 0.5, borderStyle: 'dashed', borderColor: '#c8a0ac', height: 72, justifyContent: 'center', alignItems: 'center', gap: 6, flexDirection: 'row' },
  photoHint: { fontSize: 12, color: '#b08090' },
  catChip: { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  catChipText: { fontSize: 11 },
  metalTabs: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: '#ece0e3', marginBottom: 12 },
  metalTab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  metalTabText: { fontSize: 13, fontWeight: '500' },
  metalBox: { borderRadius: 10, borderWidth: 0.5, padding: 12 },
  costBox: { borderRadius: 10, borderWidth: 0.5, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costBoxLabel: { fontSize: 12, fontWeight: '500' },
  costBoxValue: { fontSize: 16, fontWeight: '500' },
  diamondBox: { backgroundColor: '#fdfbfb', borderRadius: 10, borderWidth: 0.5, borderColor: '#ece0e3', padding: 10, marginBottom: 8 },
  diamondHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  diamondTitle: { fontSize: 10, fontWeight: '500', color: '#550a19', letterSpacing: 1 },
  dInput: { backgroundColor: '#fdf0f2', borderColor: '#ece0e3' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  toggle: { width: 36, height: 20, borderRadius: 10, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleLabel: { fontSize: 12, fontWeight: '500' },
  certBox: { backgroundColor: '#fdfbfb', borderRadius: 10, borderWidth: 0.5, borderColor: '#ece0e3', padding: 10, marginBottom: 8 },
  certLabRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 0.5, borderColor: '#ece0e3', marginBottom: 8 },
  certLabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  certLabText: { fontSize: 13, fontWeight: '500' },
  removeBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fdf0f2', borderWidth: 0.5, borderColor: '#e8c0c8', justifyContent: 'center', alignItems: 'center' },
  addDiamondBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: '#ece0e3', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fdfbfb' },
  addDiamondText: { fontSize: 12, color: '#550a19' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { fontSize: 13, color: '#806070' },
  priceVal:   { fontSize: 13, fontWeight: '500', color: '#2c1015' },
  totalLabel: { fontSize: 13, fontWeight: '500', color: '#550a19' },
  totalVal:   { fontSize: 16, fontWeight: '500', color: '#550a19' },
  sellingBox: { backgroundColor: '#fdfbfb', borderRadius: 8, padding: 10, marginTop: 8 },
  profitRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  profitLabel:{ fontSize: 12, color: '#608050' },
  profitVal:  { fontSize: 12, fontWeight: '500' },
  saveBtn: { backgroundColor: '#550a19', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  saveBtnText: { fontSize: 15, fontWeight: '500', color: '#fff5f7' },
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14, paddingBottom: 30 },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#e8d5d9', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  sheetBtnText: { fontSize: 13, color: '#2c1015' },
  modal: { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#550a19' },
  modalSearch: { backgroundColor: '#fdfbfb', borderWidth: 0.5, borderColor: '#ece0e3', borderRadius: 10, padding: 10, fontSize: 14, color: '#2c1015', marginBottom: 10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
};
