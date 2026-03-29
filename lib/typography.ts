import { Platform } from 'react-native';

const iosFamilies = {
  regular: 'AvenirNext-Regular',
  medium: 'AvenirNext-Medium',
  demi: 'AvenirNext-DemiBold',
  bold: 'AvenirNext-Bold',
  heavy: 'AvenirNext-Heavy',
};

const androidFamilies = {
  regular: 'sans-serif',
  medium: 'sans-serif-medium',
  demi: 'sans-serif-medium',
  bold: 'sans-serif-bold',
  heavy: 'sans-serif-black',
};

const webFamilies = {
  regular: 'Segoe UI',
  medium: 'Segoe UI',
  demi: 'Segoe UI Semibold',
  bold: 'Segoe UI Bold',
  heavy: 'Segoe UI Bold',
};

const families = Platform.select({
  ios: iosFamilies,
  android: androidFamilies,
  default: webFamilies,
});

export const typography = {
  family: families,
  hero: {
    fontFamily: families.heavy,
    fontWeight: '800' as const,
  },
  title: {
    fontFamily: families.bold,
    fontWeight: '700' as const,
  },
  heading: {
    fontFamily: families.demi,
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: families.regular,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontFamily: families.medium,
    fontWeight: '600' as const,
  },
  label: {
    fontFamily: families.medium,
    fontWeight: '600' as const,
  },
  caption: {
    fontFamily: families.regular,
    fontWeight: '400' as const,
  },
};
