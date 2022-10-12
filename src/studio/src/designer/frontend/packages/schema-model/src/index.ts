export { buildJsonSchema } from './lib/build-json-schema';
export { buildUiSchema } from './lib/build-ui-schema';
export { getRestrictions, StrRestrictionKeys, castRestrictionType } from './lib/restrictions';
export { ROOT_POINTER } from './lib/constants';
export type { UiSchemaNode, UiSchemaNodes } from './lib/types';
export { ObjectKind, Keywords, FieldType, CombinationKind } from './lib/types';
export {
  createNodeBase,
  replaceLastPointerSegment,
  makePointer,
  pointerIsDefinition,
  combinationIsNullable,
  pointerExists,
  splitPointerInBaseAndName,
  getNodeDisplayName,
  getUniqueNodePath,
} from './lib/utils';
export { createChildNode } from './lib/mutations/create-node';
export { removeNodeByPointer } from './lib/mutations/remove-node';
export { renameNodePointer } from './lib/mutations/rename-node';
export { convertPropToType } from './lib/mutations/promote-node';
export { getCapabilities, Capabilites } from './lib/capabilities';
export { toggleArrayAndField, canToggleArrayAndField } from './lib/mutations/toggle-array-field';
export {
  getChildNodesByNode,
  getChildNodesByPointer,
  getNodeByPointer,
  getNodeIndexByPointer,
  getParentNodeByPointer,
  getRootNode,
  getRootNodes,
} from './lib/selectors';
