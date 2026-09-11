// ══════════════════════════════════════════════════
// App.js — Root navigator สำหรับ Anakyn Gems Mobile
// ══════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getToken } from './src/storage';
import { getPendingSku, clearPendingSku } from './src/scan';
import { navRef } from './src/navRef';
import AppShell from './src/components/AppShell';

import LoginScreen       from './src/screens/LoginScreen';
import HomeScreen        from './src/screens/HomeScreen';
import SaleScreen        from './src/screens/SaleScreen';
import StockScreen       from './src/screens/StockScreen';
import InventoryScreen   from './src/screens/InventoryScreen';
import InvoiceScreen     from './src/screens/InvoiceScreen';
import QuotationScreen   from './src/screens/QuotationScreen';
import PurchaseOrderScreen from './src/screens/PurchaseOrderScreen';
import ServiceOrderScreen  from './src/screens/ServiceOrderScreen';
import SummaryScreen     from './src/screens/SummaryScreen';
import ReceiptScreen     from './src/screens/ReceiptScreen';
import AddUserScreen     from './src/screens/AddUserScreen';

const Stack = createStackNavigator();

// ── สแกน QR บนป้ายสินค้า → เด้งไปหน้าบันทึกการขายพร้อมสินค้าชิ้นนั้น ──
// รอจนผู้ใช้อยู่หน้า Home ก่อน (เผื่อยังไม่ได้ล็อกอิน จะได้เด้งหลังล็อกอินเสร็จ)
// แล้ว push หน้า Sale ทับ เพื่อให้กดย้อนกลับมา Home ได้ตามปกติ
function routeScannedSku() {
  const sku = getPendingSku();
  if (!sku || !navRef.isReady()) return;
  if (navRef.getCurrentRoute()?.name !== 'Home') return;
  clearPendingSku();
  navRef.navigate('Sale', { scanSku: sku });
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  // ชื่อหน้าที่เปิดอยู่ — AppShell ใช้ไฮไลท์เมนู และซ่อนตัวเองตอนอยู่หน้า Login
  const [routeName, setRouteName] = useState(null);

  useEffect(() => {
    // ตรวจสอบ token ที่เก็บไว้ — ถ้ามีให้ข้ามหน้า Login
    getToken().then(token => {
      const first = token ? 'Home' : 'Login';
      setInitialRoute(first);
      setRouteName(first);      // กันแถบเมนูกะพริบตอนเปิดหน้าแรก
    });
  }, []);

  // ── แก้ปัญหาเลื่อนหน้าไม่ได้บนเว็บ (Expo web) ──
  // RN-web + React Navigation ตั้ง body overflow:hidden และ card สูงเท่าเนื้อหา
  // ทำให้เนื้อหาที่ล้นจอถูกตัดและเลื่อนไม่ได้ จึง inject CSS ให้ทั้งหน้าเลื่อนได้ (web เท่านั้น)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.id = 'anakyn-web-scroll-fix';
    // โหลดฟอนต์ไอคอน MaterialCommunityIcons จาก CDN (เวอร์ชันตรงกับ @expo/vector-icons ที่ติดตั้ง)
    // กันปัญหาไฟล์ฟอนต์ภายในถูกตัดตอน deploy (path มีคำว่า node_modules) แล้วไอคอนกลายเป็นกรอบสี่เหลี่ยม
    const ICON_TTF = 'https://unpkg.com/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf';
    style.textContent = `
      @font-face { font-family: 'material-community'; src: url('${ICON_TTF}') format('truetype'); font-display: swap; }
      html { height: 100%; }
      body { height: auto !important; min-height: 100%; overflow-y: auto !important; }
      /* เต็มความกว้างหน้าจอ — ความอ่านง่ายบนจอใหญ่จัดการด้วย src/responsive.js
         (คูณขนาดฟอนต์/ปุ่มขึ้นตามจอ) แทนการบีบเป็นคอลัมน์แคบเหมือนเดิม */
      #root { height: auto !important; min-height: 100vh; display: flex; flex-direction: column; background: #f9f4f5; }
      #root > div { flex: 1 0 auto; width: 100%; }

      /* ── ตอนเปิดโมดัล ล็อกไม่ให้หน้าที่อยู่ข้างหลังเลื่อน ──
         react-native-web ไม่ล็อก body ให้เอง หน้าหลังเลยโชว์แถบเลื่อนของตัวเอง
         ซ้อนกับแถบเลื่อนของโมดัล กลายเป็น scroll bar 2 อัน
         ModalContent ใส่ role="dialog" เฉพาะตอนโมดัลเปิดจริง จึงเกาะตัวนี้ได้ตรง ๆ */
      body:has([role="dialog"]) { overflow: hidden !important; }

      /* ── ไฮไลท์ตอนเอาเมาส์ไปชี้ ──
         ใช้ filter แทนการเปลี่ยน background โดยตรง → ใช้ได้กับการ์ดทุกสี
         ไม่ต้องเขียนสี hover แยกทีละใบ และไม่ทับสไตล์เดิม
         หุ้มด้วย @media (hover:hover) กันมือถือค้างสถานะ hover หลังแตะ */
      [data-hov] { transition: filter .15s ease, box-shadow .15s ease, transform .15s ease; }
      @media (hover: hover) and (pointer: fine) {
        [data-hov="btn"]:hover,
        [data-hov="card"]:hover {
          filter: brightness(0.955);
          box-shadow: 0 2px 8px rgba(85,10,25,0.13);
        }
        [data-hov="dark"]:hover {           /* การ์ดพื้นเข้ม — ต้องสว่างขึ้นถึงจะเห็น */
          filter: brightness(1.22);
          box-shadow: 0 2px 10px rgba(85,10,25,0.28);
        }
        [data-hov="btn"]:hover { cursor: pointer; }
      }
      [data-hov="btn"]:active { transform: scale(0.985); }

      /* ── เมนูในแถบซ้าย / ลิ้นชัก ──
         ใช้สีพื้นตรง ๆ ไม่ใช้ filter เพราะพื้นแดงเข้มถ้าใช้ filter จะยิ่งมืด มองไม่ออกว่าเมาส์อยู่ตรงไหน
         ต้องมี !important เพราะ react-native-web เขียน background มาเป็นคลาสของตัวเอง */
      [data-hov="nav"] { transition: background-color .13s ease; }
      @media (hover: hover) and (pointer: fine) {
        [data-hov="nav"]:hover { background-color: #7d2034 !important; cursor: pointer; }
        [data-hov="nav"][data-on="1"]:hover { background-color: #fff5f7 !important; }
      }

      /* ── ช่องกรอกข้อมูล ──
         ใช้ border + เงา ไม่ใช้ filter เพราะ filter จะทำให้ตัวหนังสือที่พิมพ์เข้มตามไปด้วย
         ต้องใส่ !important เพราะ react-native-web เขียนสีขอบมาเป็นคลาสของตัวเอง */
      [data-hov="field"] { transition: border-color .15s ease, box-shadow .15s ease; }
      @media (hover: hover) and (pointer: fine) {
        [data-hov="field"]:hover { border-color: #c9a2ad !important; }
      }
      [data-hov="field"]:focus,
      [data-hov="field"]:focus-visible {
        border-color: #550a19 !important;
        box-shadow: 0 0 0 3px rgba(85,10,25,0.13) !important;
        outline: none !important;
      }
    `;
    if (!document.getElementById('anakyn-web-scroll-fix')) document.head.appendChild(style);
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#550a19', gap: 14 }}>
        <ActivityIndicator color="#f0d0d8" size="large" />
        <Text style={{ fontSize: 13, color: '#d4a0ac' }}>กำลังเชื่อมต่อเซิร์ฟเวอร์...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navRef}
          onReady={() => { setRouteName(navRef.getCurrentRoute()?.name); routeScannedSku(); }}
          onStateChange={() => { setRouteName(navRef.getCurrentRoute()?.name); routeScannedSku(); }}
        >
          <StatusBar style="light" backgroundColor="#550a19" />
          <AppShell routeName={routeName}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#f9f4f5' } }}
          >
            <Stack.Screen name="Login"         component={LoginScreen}          />
            <Stack.Screen name="Home"          component={HomeScreen}           />
            <Stack.Screen name="Sale"          component={SaleScreen}           />
            <Stack.Screen name="Stock"         component={StockScreen}          />
            <Stack.Screen name="Inventory"     component={InventoryScreen}      />
            <Stack.Screen name="Invoice"       component={InvoiceScreen}        />
            <Stack.Screen name="Quotation"     component={QuotationScreen}      />
            <Stack.Screen name="PurchaseOrder" component={PurchaseOrderScreen}  />
            <Stack.Screen name="ServiceOrder"  component={ServiceOrderScreen}   />
            <Stack.Screen name="Summary"       component={SummaryScreen}        />
            <Stack.Screen name="Receipt"       component={ReceiptScreen}        />
            <Stack.Screen name="AddUser"       component={AddUserScreen}        />
          </Stack.Navigator>
          </AppShell>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
