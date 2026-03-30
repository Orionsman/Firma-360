import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FirmaLogo } from '@/components/FirmaLogo';
import { typography } from '@/lib/typography';

type BrandHeroHeaderProps = {
  title?: string;
  subtitle?: string;
  brandSubtitle?: string;
  kicker?: string;
  rightAccessory?: ReactNode;
  accessoryBelow?: boolean;
  children?: ReactNode;
};

export function BrandHeroHeader({
  title,
  subtitle,
  brandSubtitle = 'Cari takibin cebinde',
  kicker = 'CEPTECARI',
  rightAccessory,
  accessoryBelow = false,
  children,
}: BrandHeroHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <LinearGradient
      colors={[theme.colors.primaryStrong, theme.colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroOrbOne} />
      <View style={styles.heroOrbTwo} />
      <View style={styles.heroOrbThree} />

      <View style={styles.heroTop}>
        <View style={styles.brandCard}>
          <View style={styles.brandHalo} />
          <View style={styles.brandRow}>
            <View style={styles.brandLogoShell}>
              <View style={styles.brandLogoAura} />
              <View style={styles.brandLogoWrap}>
                <FirmaLogo size="md" showWordmark={false} logoScale={1.08} />
              </View>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>CepteCari</Text>
              <Text style={styles.brandKicker}>{kicker}</Text>
              <Text style={styles.brandSubtitle}>{brandSubtitle}</Text>
            </View>
          </View>
        </View>
        {rightAccessory && !accessoryBelow ? (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        ) : null}
      </View>

      {rightAccessory && accessoryBelow ? (
        <View style={styles.accessoryBelow}>{rightAccessory}</View>
      ) : null}

      {title ? <Text style={styles.pageTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.bottomSlot}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroOrbOne: {
    position: 'absolute',
    top: -34,
    right: -26,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  heroOrbTwo: {
    position: 'absolute',
    bottom: -44,
    left: -18,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(25,184,166,0.12)',
  },
  heroOrbThree: {
    position: 'absolute',
    bottom: -54,
    right: '24%',
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(9, 21, 56, 0.14)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  brandCard: {
    position: 'relative',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  brandHalo: {
    position: 'absolute',
    right: -16,
    top: -20,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(86,213,255,0.14)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogoShell: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoAura: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(34,228,214,0.18)',
  },
  brandLogoWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
  },
  brandKicker: {
    ...typography.label,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  brandTitle: {
    ...typography.hero,
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 1,
  },
  brandSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  rightAccessory: {
    marginTop: 10,
  },
  accessoryBelow: {
    alignItems: 'flex-end',
    marginTop: 14,
  },
  pageTitle: {
    ...typography.hero,
    color: '#FFFFFF',
    fontSize: 30,
    marginTop: 16,
    lineHeight: 36,
  },
  pageSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  bottomSlot: {
    marginTop: 16,
  },
});
