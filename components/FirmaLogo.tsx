import { Image, StyleSheet, Text, View } from 'react-native';
import { typography } from '@/lib/typography';

type FirmaLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  logoScale?: number;
};

const dimensions = {
  sm: 56,
  md: 76,
  lg: 108,
};

const WORDMARK = '#F7FAFF';
const TAGLINE = 'rgba(247,250,255,0.82)';
const LOGO_SOURCE = require('../assets/cepte-cari-logo-tight.png');

export function FirmaLogo({
  size = 'md',
  showWordmark = true,
  logoScale = 1,
}: FirmaLogoProps) {
  const dimension = dimensions[size];

  return (
    <View style={styles.wrapper}>
      <Image
        source={LOGO_SOURCE}
        style={[
          styles.mark,
          {
            width: dimension,
            height: dimension,
            marginBottom: showWordmark ? 14 : 0,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />
      {showWordmark ? (
        <>
          <Text style={[styles.wordmark, { color: WORDMARK }]}>CepteCari</Text>
          <Text style={[styles.tagline, { color: TAGLINE }]}>
            Cari takibin cebinde
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  mark: {
    shadowColor: '#2B0F52',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  wordmark: {
    ...typography.hero,
    fontSize: 28,
    letterSpacing: 0,
    textShadowColor: 'rgba(10, 3, 30, 0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  tagline: {
    ...typography.caption,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(10, 3, 30, 0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
