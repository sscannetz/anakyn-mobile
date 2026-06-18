# AnakynMobile — Expo React Native App

## ต้องติดตั้งอะไรบ้าง (Prerequisites)

| เครื่องมือ | ลิงก์ |
|---|---|
| Node.js 18+ | https://nodejs.org |
| Expo CLI | `npm install -g expo-cli` |
| Expo Go (มือถือ) | App Store / Play Store — ค้นหา "Expo Go" |

---

## วิธีรัน

```bash
# 1. เข้าโฟลเดอร์โปรเจค
cd AnakynMobile

# 2. ติดตั้ง dependencies
npm install

# 3. รัน dev server
npx expo start
```

จะเห็น QR code ในเทอร์มินัล — สแกนด้วย **Expo Go** บนมือถือ

---

## แก้ BASE_URL ก่อนเปิดแอป

เปิดไฟล์ `src/api.js` และแก้บรรทัดนี้:

```js
export const BASE_URL = 'http://192.168.1.100:4000/api'; // ← แก้ตรงนี้
```

| สถานการณ์ | URL |
|---|---|
| iOS Simulator (Mac) | `http://localhost:4000/api` |
| Android Emulator | `http://10.0.2.2:4000/api` |
| มือถือจริง (Wi-Fi เดียวกัน) | `http://192.168.x.x:4000/api` (IP เครื่อง server) |

หา IP เครื่อง:
- Windows: `ipconfig` → IPv4 Address
- Mac/Linux: `ifconfig | grep inet`

---

## โครงสร้างโปรเจค

```
AnakynMobile/
├── App.js                       # root navigator + auth check
├── app.json                     # Expo config (ชื่อแอป, permissions)
├── babel.config.js
├── package.json
└── src/
    ├── api.js                   # endpoint ทั้งหมด (แก้ BASE_URL ที่นี่)
    ├── storage.js               # AsyncStorage wrapper (token/role)
    ├── components/
    │   └── Header.jsx           # Header bar ที่ใช้ร่วมกันทุกหน้า
    └── screens/
        ├── LoginScreen.jsx      # หน้า Login + role selector
        ├── HomeScreen.jsx       # Dashboard หน้าหลัก
        ├── SaleScreen.jsx       # ระบบขาย + cart
        ├── StockScreen.jsx      # เพิ่มสินค้า (ถ่ายรูป, ข้อมูลทอง)
        ├── InvoiceScreen.jsx    # ใบกำกับภาษี
        ├── QuotationScreen.jsx  # ใบเสนอราคา
        ├── PurchaseOrderScreen.jsx  # ใบสั่งซื้อ
        ├── ServiceOrderScreen.jsx   # ใบสั่งซ่อม
        ├── SummaryScreen.jsx    # รายงานสรุป
        └── AddUserScreen.jsx    # จัดการผู้ใช้ (Admin เท่านั้น)
```

---

## Build สำหรับ Production

ใช้ EAS Build (Expo Application Services):

```bash
npm install -g eas-cli
eas login
eas build --platform android   # ได้ .apk / .aab
eas build --platform ios       # ได้ .ipa (ต้องมี Apple Developer Account)
```

ดูข้อมูลเพิ่มเติม: https://docs.expo.dev/build/introduction/

---

## Dependencies หลัก

| Package | ใช้สำหรับ |
|---|---|
| `expo ~51.0.0` | Runtime หลัก |
| `@react-navigation/stack` | การนำทางระหว่างหน้า |
| `@react-native-async-storage/async-storage` | เก็บ JWT token |
| `expo-image-picker` | เปิดกล้อง/คลัง |
| `expo-image-manipulator` | Resize รูปก่อน upload |
| `@expo/vector-icons` (MaterialCommunityIcons) | ไอคอนทั้งหมด |
| `react-native-safe-area-context` | Safe area (notch/home bar) |
| `react-native-screens` | Navigation performance |

---

## Notes

- Backend ต้องรันก่อน (`cd anakyn-fullstack && npm run dev` หรือ `npm start`)
- JWT token เก็บไว้ใน AsyncStorage — ออกจากระบบจาก Home หน้า header หรือ logout button
- ภาษาไทย/อังกฤษสลับได้ทุกหน้าจาก flag icon มุมขวาบน
- หน้า AddUser ซ่อนไว้สำหรับ role = 'admin' เท่านั้น
