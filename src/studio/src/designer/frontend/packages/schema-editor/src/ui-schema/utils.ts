import { CombinationKind, FieldType } from '../types';
import { ObjectKind } from '../types/enums';
import { JsonSchemaNode, UiSchemaNode } from './types';

export const createNodeBase = (...args: string[]): UiSchemaNode => {
  const pointer = args.join('/');
  return {
    objectKind: ObjectKind.Field,
    fieldType: FieldType.Object,
    nodeId: createNodeId(),
    pointer,
    isRequired: false,
    isNillable: false,
    children: [],
    custom: {},
    restrictions: [],
    implicitType: false,
    default: undefined,
    enum: [],
  };
};
export const createNodeId = () => (Math.random() + 1).toString(36).substring(7);

export const createPointerLookupTable = (map: Map<string, UiSchemaNode>): Map<string, string> => {
  const lookupTable = new Map();
  map.forEach((item) => lookupTable.set(item.pointer, item.nodeId));
  return lookupTable;
};

/**
 * Returns a combination kind or undefined.
 * @param schemaNode
 */
export const getCombinationKind = (schemaNode: JsonSchemaNode): CombinationKind => {
  const kinds = Object.values(CombinationKind).filter((k) => Object.keys(schemaNode).includes(k));
  return kinds[0];
};
export const getObjectKind = (schemaNode: JsonSchemaNode): ObjectKind => {
  if (schemaNode.$ref) {
    return ObjectKind.Reference;
  } else if (getCombinationKind(schemaNode)) {
    return ObjectKind.Combination;
  } else if (schemaTypeIncludes(schemaNode.type, FieldType.Array)) {
    return ObjectKind.Array;
  } else {
    return ObjectKind.Field;
  }
};

export const schemaTypeIncludes = (schemaNodeType: string | string[], type: FieldType) =>
  schemaNodeType === type || (Array.isArray(schemaNodeType) && schemaNodeType.includes(type));

export const schemaTypeIsNillable = (schemaNodeType: string | string[]) =>
  schemaNodeType !== FieldType.Null && schemaTypeIncludes(schemaNodeType, FieldType.Null);
