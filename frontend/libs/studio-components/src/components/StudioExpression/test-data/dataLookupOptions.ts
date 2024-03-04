import type { DataLookupOptions } from '../types/DataLookupOptions';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';

export const datamodelPointers: string[] = ['#', '#/properties/test1', '#/properties/test2'];
export const componentIds: string[] = ['component1', 'component2', 'component3'];

export const dataLookupOptions: DataLookupOptions = {
  [DataLookupFuncName.DataModel]: datamodelPointers,
  [DataLookupFuncName.Component]: componentIds,
};
