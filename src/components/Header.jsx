// ══════════════════════════════════════════════════════
// Header.jsx — Header component ที่ใช้ทุก screen
// ══════════════════════════════════════════════════════
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useScaledStyles } from '../responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openDrawer } from '../navRef';
import { SHELL_BP } from './AppShell';
import { useTheme } from '../theme';

export default function Header({ title, subtitle, onBack, lang, onLangToggle, rightComponent }) {
  const { styles, sc, center, t: th } = useScaledStyles(baseStyles);
  const { mourn, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // จอกว้างมีแถบเมนูค้างอยู่ซ้ายมือแล้ว ไม่ต้องมีปุ่มขีดสามขีดและโลโก้ซ้ำ
  const hasSide = Platform.OS === 'web' && width >= SHELL_BP;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={sc(19)} color={th.brand} />
          </TouchableOpacity>
        ) : hasSide ? null : (
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={openDrawer} style={styles.backBtn}>
            <MaterialCommunityIcons name="menu" size={sc(19)} color={th.brand} />
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        <View style={styles.rightGroup}>
          {onLangToggle && (
            <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={onLangToggle} style={styles.langBtn}>
              <MaterialCommunityIcons name="translate" size={sc(13)} color={th.brand} />
              <Text style={styles.langText}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity dataSet={{ hov: 'btn' }} onPress={toggle} style={styles.themeBtn}
            accessibilityRole="button"
            accessibilityLabel={mourn ? 'กลับสู่โหมดปกติ' : 'เปิดโหมดไว้อาลัย'}>
            <MaterialCommunityIcons name={mourn ? 'palette' : 'circle-half-full'}
              size={sc(14)} color={th.brand} />
          </TouchableOpacity>
          {rightComponent}
        </View>
      </View>
    </View>
  );
}

const baseStyles = (th) => ({
  container: {
    backgroundColor: th.card,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: th.line,
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
    backgroundColor: th.card,
    borderWidth: 1,
    borderColor: th.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBlock: {
    marginRight: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '600',
    color: th.brandOn,
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 8,
    color: th.dim,
    letterSpacing: 3,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 10, minWidth: 0 },
  title: { fontSize: 15.5, fontWeight: '600', color: th.ink },
  subtitle: { fontSize: 11.5, color: th.muted, flexShrink: 1 },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: th.card,
    borderWidth: 1,
    borderColor: th.line,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: th.brand,
  },
  themeBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: th.card,
    borderWidth: 1, borderColor: th.line,
    alignItems: 'center', justifyContent: 'center',
  },
});
