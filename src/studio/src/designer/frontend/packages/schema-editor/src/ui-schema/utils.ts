import { CombinationKind, FieldType } from '../types';
import { ObjectKind } from '../types/enums';
import { JsonSchemaNode, UiSchemaMap, UiSchemaNode } from './types';

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
let currentId = 0;
export const createNodeId = (): number => {
  currentId++;
  return 1000 + currentId;
};
export const resetNodeIds = () => {
  currentId = 0;
};

export const createPointerLookupTable = (map: UiSchemaMap): Map<string, number> => {
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

export const getParentNodeByPointer = (
  map: UiSchemaMap,
  pointer: string,
): UiSchemaNode | undefined => {
  const lookup = createPointerLookupTable(map);
  const pointerParts = pointer.split('/');
  while (pointerParts.length) {
    pointerParts.pop();
    const parentNodePointer = pointerParts.join('/');
    if (lookup.has(parentNodePointer)) {
      return map.get(lookup.get(parentNodePointer) as number);
    }
  }
};

export const arrayIntersection = (arrA: any[], arrB: any[]) => arrA.filter((x) => arrB.includes(x));

export const arrayUnique = (arr: any[]) => {
  const j: any = {};
  arr.forEach((v) => (j[`${v}::${typeof v}`] = v));
  return Object.keys(j).map((v) => j[v]);
};

export const cloneMap = (map: Map<any, any>): Map<any, any> =>
  new Map(JSON.parse(JSON.stringify(Array.from(map))));
