export { buildJsonSchema } from './lib/build-json-schema';
export { buildUiSchema } from './lib/build-ui-schema';
export { castRestrictionType } from './lib/restrictions';
export { ROOT_POINTER } from './lib/constants';
export type { UiSchemaNode, UiSchemaNodes } from './types';
export type { FieldNode } from './types/FieldNode';
export type { CombinationNode } from './types/CombinationNode';
export type { ReferenceNode } from './types/ReferenceNode';
export * from './types';
export {
  combinationIsNullable,
  createNodeBase,
  getNameFromPointer,
  getUniqueNodePath,
  isArray,
  isCombination,
  isDefinition,
  isField,
  isFieldOrCombination,
  isNodeValidParent,
  isObject,
  isProperty,
  isReference,
  isTheRootNode,
  pointerIsDefinition,
  replaceLastPointerSegment,
  splitPointerInBaseAndName,
} from './lib/utils';
export { removeNodeByPointer } from './lib/mutations/remove-node';
export { renameNodePointer } from './lib/mutations/rename-node';
export { convertPropToType } from './lib/mutations/convert-node';
export * from './lib/mutations/custom-properties';
export * from './lib/mutations/ui-schema-reducers';
export { getCapabilities, Capabilites } from './lib/capabilities';
export {
  getChildNodesByFieldPointer,
  getNodeByPointer,
  getNodeIndexByPointer,
  getParentNodeByPointer,
  getReferredNodes,
  getRootNode,
  hasNodePointer,
} from './lib/selectors';
export { SchemaModel } from './lib/SchemaModel';
export * from './lib/pointerUtils';
export { validateTestUiSchema, testSchemaNodes } from '../test/validateTestUiSchema';
