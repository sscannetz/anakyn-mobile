// ══════════════════════════════════════════════════════
// Header.jsx — Header component ที่ใช้ทุก screen
// ══════════════════════════════════════════════════════
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useScaledStyles } from '../responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openDrawer } from '../navRef';
import { SHELL_BP } from './AppShell';

export default function Header({ title, subtitle, onBack, lang, onLangToggle, rightComponent }) {
  const { styles, sc, center } = useScaledStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // จอกว้างมีแถบเมนูค้างอยู่ซ้ายมือแล้ว ไม่ต้องมีปุ่มขีดสามขีดและโลโก้ซ้ำ
  const hasSide = Platform.OS === 'web' && width >= SHELL_BP;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={sc(19)} color="#550a19" />
          </TouchableOpacity>
        ) : hasSide ? null : (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={openDrawer} style={styles.backBtn}>
            <MaterialCommunityIcons name="menu" size={sc(19)} color="#550a19" />
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        <View style={styles.rightGroup}>
          {onLangToggle && (
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onLangToggle} style={styles.langBtn}>
              <MaterialCommunityIcons name="translate" size={sc(13)} color="#550a19" />
              <Text style={styles.langText}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
            </TouchableOpacity>
          )}
          {rightComponent}
        </View>
      </View>
    </View>
  );
}

const baseStyles = {
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ece0e3',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ece0e3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBlock: {
    marginRight: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5e8eb',
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 8,
    color: '#d4a0ac',
    letterSpacing: 3,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 10, minWidth: 0 },
  title: { fontSize: 15.5, fontWeight: '600', color: '#2c1015' },
  subtitle: { fontSize: 11.5, color: '#9b7d86', flexShrink: 1 },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ece0e3',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#550a19',
  },
};
