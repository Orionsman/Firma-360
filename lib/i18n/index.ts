import { en } from './en';
import { tr, type TranslationSchema } from './tr';

export const dictionaries = {
  tr,
  en,
} as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = string;
export type TranslationValue = string;

let currentLocale: Locale = 'tr';

export const getLocale = () => currentLocale;

export const setLocale = (locale: Locale) => {
  currentLocale = locale;
};

export const getDictionary = (locale: Locale = currentLocale) => dictionaries[locale];

const resolvePath = <K extends TranslationKey>(
  source: TranslationSchema,
  key: K
): TranslationValue => {
  return key.split('.').reduce((value, part) => {
    return (value as Record<string, unknown>)[part];
  }, source as unknown) as TranslationValue;
};

type Translator = TranslationSchema & {
  <K extends TranslationKey>(key: K): TranslationValue;
  locale: () => Locale;
  setLocale: (locale: Locale) => void;
  dictionary: (locale?: Locale) => TranslationSchema;
};

const translatorTarget = Object.assign(
  (<K extends TranslationKey>(key: K) => resolvePath(getDictionary(), key)) as <
    K extends TranslationKey,
  >(
    key: K
  ) => TranslationValue,
  {
    locale: getLocale,
    setLocale,
    dictionary: getDictionary,
  }
);

export const t = new Proxy(translatorTarget, {
  apply(target, _thisArg, argArray) {
    return target(argArray[0] as TranslationKey);
  },
  get(target, prop, receiver) {
    if (typeof prop === 'string' && !(prop in target)) {
      return Reflect.get(getDictionary(), prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  },
}) as Translator;

export const tx = t;
