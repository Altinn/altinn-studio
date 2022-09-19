import { UiSchemaMap } from './types';
import { createPointerLookupTable } from './utils';

export * from './build-ui-schema';
export * from './build-json-schema';

export const isPointerInUse = (uiNodeMap: UiSchemaMap, pointer: string) => {
  return createPointerLookupTable(uiNodeMap).has(pointer);
};
