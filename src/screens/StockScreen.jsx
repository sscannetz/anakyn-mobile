// ══════════════════════════════════════════════════════
// StockScreen.jsx — หน้า "เพิ่มสต๊อกสินค้า"
// เหลือแค่ฟอร์มเพิ่มสินค้าใหม่ — ส่วนรายการสินค้า / ปริ้นป้าย
// ย้ายไปหน้า "สต๊อกสินค้า" (InventoryScreen.jsx) แล้ว
// ══════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ConnectingBar from '../components/ConnectingBar';
import ProductForm from '../components/ProductForm';
import { api } from '../api';
import { useScaledStyles } from '../responsive';

const TITLE = { th: 'เพิ่มสต๊อกสินค้า', en: 'Add Stock' };

export default function StockScreen({ navigation }) {
  const { styles: s } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState('th');

  // ใช้แค่จำนวนสินค้าที่มีอยู่ เพื่อตั้งเลข SKU ถัดไป
  // nextSku ตั้งครั้งเดียวตอนโหลด — หลังบันทึก ฟอร์มเดินเลขเองต่อ
  // (ถ้าอัปเดต prop ทุกครั้งที่บันทึก จะไปทับเลขที่ผู้ใช้กดปรับเอง)
  const [stockCount, setStockCount] = useState(0);
  const [nextSku, setNextSku]       = useState(1);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // light=true → ไม่ลากรูป base64 ของสินค้าทุกชิ้นมา (หน้านี้ใช้แค่จำนวนไว้ตั้งเลข SKU)
    api.getProducts({ light: 'true' })
      .then(data => {
        const n = Array.isArray(data) ? data.length : 0;
        setStockCount(n);
        setNextSku(n + 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (payload) => {
    const saved = await api.createProduct(payload);
    setStockCount(n => n + 1);
    return saved;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbfb', paddingTop: insets.top }}>
      <Header title={TITLE[lang]} onBack={() => navigation.goBack()} lang={lang}
        onLangToggle={() => setLang(l => (l === 'th' ? 'en' : 'th'))} />
      <ConnectingBar visible={loading} lang={lang} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <ProductForm
          mode="create"
          lang={lang}
          nextSkuNum={nextSku}
          stockCount={stockCount}
          onSubmit={handleCreate}
        />
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const baseStyles = {
  content: { padding: 14, paddingBottom: 30 },
};
