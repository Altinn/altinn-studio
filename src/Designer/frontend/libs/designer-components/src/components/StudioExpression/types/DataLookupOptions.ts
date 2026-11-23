import type { DataLookupFuncName } from '../enums/DataLookupFuncName';

export type DataLookupOptions = {
  [K in DataLookupFuncName]: string[];
};
