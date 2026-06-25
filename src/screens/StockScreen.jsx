// ══════════════════════════════════════════════════════
// StockScreen.jsx — React Native version of AnakynAddStock
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
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
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text>{children}</View>;
}
function Sec({ children }) {
  return <View style={s.sec}>{children}</View>;
}
function SecHead({ icon, children, col = '#550a19' }) {
  return (
    <View style={s.secHead}>
      <MaterialCommunityIcons name={icon} size={14} color={col} />
      <Text style={[s.secHeadText, { color: col }]}>{children}</Text>
    </View>
  );
}
function Toggle({ on, onChange }) {
  return (
    <TouchableOpacity onPress={() => onChange(!on)} style={[s.toggle, { backgroundColor: on ? '#550a19' : '#e0d8da' }]}>
      <View style={[s.toggleKnob, { left: on ? 18 : 2 }]} />
    </TouchableOpacity>
  );
}

export default function StockScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');
  const t = T[lang];

  const [stockList, setStockList]   = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [skuNum, setSkuNum]         = useState(1);
  const [photoUri, setPhotoUri]     = useState(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

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
                  <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPhotoUri(null)} style={s.photoBtn}>
                  <MaterialCommunityIcons name="trash-can" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setPhotoMenuOpen(true)} style={s.photoPlaceholder}>
              <MaterialCommunityIcons name="camera" size={24} color="#c8a0b0" />
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
                  <TextInput style={[s.input, { borderColor: tab.border }]} value={metalWeight} onChangeText={setMetalWeight} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#c0a0a8" />
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
                    <MaterialCommunityIcons name="close" size={10} color="#550a19" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field label={t.dWeight}>
                    <TextInput style={[s.input, s.dInput]} value={d.weight} onChangeText={v => updD(d.id, 'weight', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#c0a0a8" />
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
            <MaterialCommunityIcons name="plus" size={14} color="#534AB7" />
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
          {saving ? <ActivityIndicator color="#fff5f7" size="small" /> : <MaterialCommunityIcons name="check" size={18} color="#fff5f7" />}
          <Text style={s.saveBtnText}>{saving ? t.saving : t.saveBtn(skuLabel)}</Text>
        </TouchableOpacity>

        {/* CURRENT STOCK */}
        <Sec>
          <SecHead icon="view-list">{t.currentStock} {!loadingList && `(${stockList.length})`}</SecHead>
          {loadingList && <ActivityIndicator color="#550a19" />}
          {stockList.slice(0, 8).map(p => (
            <View key={p.id} style={s.stockItem}>
              <View style={{ flex: 1 }}>
                <Text style={s.stockName}>{p.name}</Text>
                <Text style={s.stockSku}>{p.sku} · คงเหลือ {p.stock_qty}</Text>
              </View>
              <Text style={s.stockPrice}>฿{fmt(p.sale_price)}</Text>
            </View>
          ))}
        </Sec>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* PHOTO MENU MODAL */}
      <Modal visible={photoMenuOpen} transparent animationType="slide">
        <TouchableOpacity style={s.bottomSheetOverlay} onPress={() => setPhotoMenuOpen(false)} activeOpacity={1}>
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <TouchableOpacity onPress={() => pickPhoto(true)} style={s.sheetBtn}>
              <MaterialCommunityIcons name="camera" size={18} color="#550a19" />
              <Text style={s.sheetBtnText}>{t.photoTakeNew}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickPhoto(false)} style={s.sheetBtn}>
              <MaterialCommunityIcons name="image" size={18} color="#550a19" />
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
              <MaterialCommunityIcons name="close" size={22} color="#550a19" />
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
    </View>
  );
}

const s = StyleSheet.create({
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
  stockItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f0e4e8' },
  stockName: { fontSize: 12, fontWeight: '500', color: '#2c1015' },
  stockSku:  { fontSize: 10, color: '#a07080' },
  stockPrice:{ fontSize: 13, fontWeight: '500', color: '#550a19' },
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
});
