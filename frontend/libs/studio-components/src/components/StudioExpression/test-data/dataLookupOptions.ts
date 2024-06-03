import type { DataLookupOptions } from '../types/DataLookupOptions';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';

export const dataModelPointers: string[] = ['#', '#/properties/test1', '#/properties/test2'];
export const componentIds: string[] = ['component1', 'component2', 'component3'];

export const gatewayActions: string[] = ['sign', 'reject'];

export const dataLookupOptions: DataLookupOptions = {
  [DataLookupFuncName.DataModel]: dataModelPointers,
  [DataLookupFuncName.Component]: componentIds,
  [DataLookupFuncName.GatewayAction]: gatewayActions,
};
