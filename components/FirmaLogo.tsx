import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

type FirmaLogoProps = {
  size?: 'sm' | 'md' | 'lg';
};

const dimensions = {
  sm: 56,
  md: 76,
  lg: 108,
};

export function FirmaLogo({ size = 'md' }: FirmaLogoProps) {
  const { theme } = useAppTheme();
  const dimension = dimensions[size];
  const crescentSize = dimension * 0.9;
  const phoneWidth = dimension * 0.34;
  const phoneHeight = dimension * 0.52;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.mark,
          {
            width: dimension,
            height: dimension,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <View
          style={[
            styles.crescentWrap,
            {
              width: crescentSize,
              height: crescentSize,
              borderRadius: crescentSize / 2,
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primaryStrong, '#AD46FF', theme.colors.primary]}
            start={{ x: 0.05, y: 0.1 }}
            end={{ x: 0.95, y: 0.9 }}
            style={styles.crescentOuter}
          />
          <View
            style={[
              styles.crescentInnerCut,
              { backgroundColor: theme.colors.background },
            ]}
          />
        </View>

        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.phoneShell,
            {
              width: phoneWidth,
              height: phoneHeight,
              borderRadius: phoneWidth * 0.22,
            },
          ]}
        >
          <View
            style={[
              styles.phoneInner,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: phoneWidth * 0.18,
              },
            ]}
          >
            <Text
              style={[
                styles.logoText,
                { color: theme.colors.accent, fontSize: dimension * 0.34 },
              ]}
            >
              ₺
            </Text>
            <View
              style={[
                styles.homeIndicator,
                {
                  backgroundColor: theme.colors.accent,
                  width: phoneWidth * 0.34,
                },
              ]}
            />
          </View>
        </LinearGradient>
      </View>
      <Text style={[styles.wordmark, { color: theme.colors.text }]}>CepteCari</Text>
      <Text style={[styles.tagline, { color: theme.colors.textMuted }]}>
        Cari takibin cebinde
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
  },
  crescentWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crescentOuter: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  crescentInnerCut: {
    position: 'absolute',
    width: '66%',
    height: '66%',
    borderRadius: 999,
    right: '-4%',
  },
  phoneShell: {
    transform: [{ rotate: '13deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 7,
  },
  phoneInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    height: 4,
    borderRadius: 999,
  },
  logoText: {
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
