import {
  CombinationKind,
  FieldType,
  JsonSchemaNode,
  ObjectKind,
  UiSchemaMap,
  UiSchemaNode,
} from './types';

export const createNodeBase = (...args: string[]): UiSchemaNode => {
  const pointer = args.join('/');
  return {
    objectKind: ObjectKind.Field,
    fieldType: FieldType.Object,
    pointer,
    isRequired: false,
    isNillable: false,
    children: [],
    custom: {},
    restrictions: [],
    implicitType: true,
    default: undefined,
    enum: [],
  };
};

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
  uiNodeMap: UiSchemaMap,
  pointer: string,
): UiSchemaNode | undefined => {
  const pointerParts = pointer.split('/');
  while (pointerParts.length) {
    pointerParts.pop();
    const parentNodePointer = pointerParts.join('/');
    if (uiNodeMap.has(parentNodePointer)) {
      return uiNodeMap.get(parentNodePointer);
    }
  }
  return undefined;
};

export const arrayIntersection = (arrA: any[], arrB: any[]) => arrA.filter((x) => arrB.includes(x));

export const arrayUnique = (arr: any[]) => {
  const j: any = {};
  arr.forEach((v) => (j[`${v}::${typeof v}`] = v));
  return Object.keys(j).map((v) => j[v]);
};

export const cloneMap = (map: Map<any, any>): Map<any, any> =>
  new Map(JSON.parse(JSON.stringify(Array.from(map))));

export const replaceLastPointerSegment = (pointer: string, newLastSegment: string): string => {
  const parts = pointer.split('/');
  parts.pop();
  parts.push(newLastSegment);
  return parts.join('/');
};

export const splitPointerInBaseAndName = (pointer: string) => {
  const parts = pointer.split('/');
  return {
    name: parts.pop(),
    base: parts.join('/'),
  };
};

export const isNumeric = (str: string) => parseInt(str).toString() === str;
