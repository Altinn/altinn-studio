export { buildJsonSchema } from './lib/build-json-schema';
export { buildUiSchema } from './lib/build-ui-schema';
export { ROOT_POINTER } from './lib/constants';
export type { UiSchemaNode, UiSchemaNodes } from './types';
export type { FieldNode } from './types/FieldNode';
export type { CombinationNode } from './types/CombinationNode';
export type { ReferenceNode } from './types/ReferenceNode';
export * from './types';
export {
  combinationIsNullable,
  createNodeBase,
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
export * from './lib/mutations/custom-properties';
export * from './lib/mutations/ui-schema-reducers';
export { getCapabilities, Capabilites } from './lib/capabilities';
export { SchemaModel } from './lib/SchemaModel';
export * from './lib/pointerUtils';
export { validateTestUiSchema, testSchemaNodes } from '../test/validateTestUiSchema';
