import { tr } from './tr/index';

export { tr } from './tr/index';

type WidenLiteral<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends null | undefined
        ? T
        : T extends readonly (infer U)[]
          ? readonly WidenLiteral<U>[]
          : { [K in keyof T]: WidenLiteral<T[K]> };

export type TranslationSchema = WidenLiteral<typeof tr>;
