// ══════════════════════════════════════════════════════
// Header.jsx — Header component ที่ใช้ทุก screen
// ══════════════════════════════════════════════════════
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Header({ title, onBack, lang, onLangToggle, rightComponent }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#f0d0d8" />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBlock}>
            <Text style={styles.logoText}>ANAKYN</Text>
            <Text style={styles.logoSub}>GEMS</Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        <View style={styles.rightGroup}>
          {onLangToggle && (
            <TouchableOpacity onPress={onLangToggle} style={styles.langBtn}>
              <MaterialCommunityIcons name="translate" size={13} color="#f5e0e5" />
              <Text style={styles.langText}>{lang === 'th' ? 'EN' : 'ไทย'}</Text>
            </TouchableOpacity>
          )}
          {rightComponent}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#550a19',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff5f7',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  langText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#f5e0e5',
  },
});
