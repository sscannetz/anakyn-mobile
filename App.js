// ══════════════════════════════════════════════════
// App.js — Root navigator สำหรับ Anakyn Gems Mobile
// ══════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getToken } from './src/storage';

import LoginScreen       from './src/screens/LoginScreen';
import HomeScreen        from './src/screens/HomeScreen';
import SaleScreen        from './src/screens/SaleScreen';
import StockScreen       from './src/screens/StockScreen';
import InvoiceScreen     from './src/screens/InvoiceScreen';
import QuotationScreen   from './src/screens/QuotationScreen';
import PurchaseOrderScreen from './src/screens/PurchaseOrderScreen';
import ServiceOrderScreen  from './src/screens/ServiceOrderScreen';
import SummaryScreen     from './src/screens/SummaryScreen';
import AddUserScreen     from './src/screens/AddUserScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    // ตรวจสอบ token ที่เก็บไว้ — ถ้ามีให้ข้ามหน้า Login
    getToken().then(token => {
      setInitialRoute(token ? 'Home' : 'Login');
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#550a19' }}>
        <ActivityIndicator color="#f0d0d8" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#550a19" />
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#f9f4f5' } }}
          >
            <Stack.Screen name="Login"         component={LoginScreen}          />
            <Stack.Screen name="Home"          component={HomeScreen}           />
            <Stack.Screen name="Sale"          component={SaleScreen}           />
            <Stack.Screen name="Stock"         component={StockScreen}          />
            <Stack.Screen name="Invoice"       component={InvoiceScreen}        />
            <Stack.Screen name="Quotation"     component={QuotationScreen}      />
            <Stack.Screen name="PurchaseOrder" component={PurchaseOrderScreen}  />
            <Stack.Screen name="ServiceOrder"  component={ServiceOrderScreen}   />
            <Stack.Screen name="Summary"       component={SummaryScreen}        />
            <Stack.Screen name="AddUser"       component={AddUserScreen}        />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
