export { buildJsonSchema } from './lib/build-json-schema';
export { buildUiSchema } from './lib/build-ui-schema';
export { castRestrictionType } from './lib/restrictions';
export { ROOT_POINTER } from './lib/constants';
export type { UiSchemaNode, UiSchemaNodes } from './types';
export * from './types';
export {
  createNodeBase,
  replaceLastPointerSegment,
  makePointer,
  pointerIsDefinition,
  combinationIsNullable,
  splitPointerInBaseAndName,
  getNameFromPointer,
  getUniqueNodePath,
} from './lib/utils';
export { createChildNode } from './lib/mutations/create-node';
export { removeNodeByPointer } from './lib/mutations/remove-node';
export { renameNodePointer } from './lib/mutations/rename-node';
export { convertPropToType } from './lib/mutations/convert-node';
export * from './lib/mutations/custom-properties';
export * from './lib/mutations/ui-schema-reducers';
export { getCapabilities, Capabilites } from './lib/capabilities';
export {
  getChildNodesByPointer,
  getNodeByPointer,
  getNodeIndexByPointer,
  getParentNodeByPointer,
  getReferredNodes,
  getRootNode,
  getRootNodes,
  hasNodePointer,
} from './lib/selectors';
