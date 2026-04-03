import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENCY_OPTIONS,
  SupportedCurrency,
  getFormattingCurrency,
  setFormattingCurrency,
} from '@/lib/format';

interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  currencyOptions: typeof CURRENCY_OPTIONS;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);
const CURRENCY_STORAGE_KEY = 'cepte_cari_currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(getFormattingCurrency());

  useEffect(() => {
    let mounted = true;

    const loadCurrency = async () => {
      try {
        const storedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (
          mounted &&
          (storedCurrency === 'TRY' ||
            storedCurrency === 'USD' ||
            storedCurrency === 'EUR' ||
            storedCurrency === 'GBP')
        ) {
          setFormattingCurrency(storedCurrency);
          setCurrencyState(storedCurrency);
        }
      } catch {
        // Keep default TRY when storage is unavailable.
      }
    };

    void loadCurrency();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      currency,
      setCurrency: (nextCurrency: SupportedCurrency) => {
        setFormattingCurrency(nextCurrency);
        setCurrencyState(nextCurrency);
        void AsyncStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
      },
      currencyOptions: CURRENCY_OPTIONS,
    }),
    [currency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }

  return context;
};
