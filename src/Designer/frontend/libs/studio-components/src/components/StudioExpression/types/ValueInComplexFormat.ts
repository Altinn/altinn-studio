import type { DataLookupFunc, KeyLookupFunc } from './Expression';

export type ValueInComplexFormat =
  | DataLookupFunc
  | KeyLookupFunc
  | string
  | number
  | boolean
  | null;
