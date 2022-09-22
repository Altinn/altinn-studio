import { UiSchemaMap } from './lib/types';
import { createPointerLookupTable } from './lib/utils';

export * from './lib/build-ui-schema';
export * from './lib/build-json-schema';
export * from './lib/types';
export * from './lib/restrictions';

export const isPointerInUse = (uiNodeMap: UiSchemaMap, pointer: string) => {
  return createPointerLookupTable(uiNodeMap).has(pointer);
};
