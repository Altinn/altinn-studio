import type { JsonSchemaNode, UiSchemaNode, UiSchemaNodes } from './types';
import { CombinationKind, FieldType, Keywords, ObjectKind, ROOT_POINTER } from './types';
import { getNodeIndexByPointer } from './selectors';

export const createNodeBase = (...args: string[]): UiSchemaNode => {
  return {
    objectKind: ObjectKind.Field,
    fieldType: FieldType.Object,
    pointer: makePointer(...args),
    isRequired: false,
    isNillable: false,
    isCombinationItem: false,
    children: [],
    custom: {},
    restrictions: [],
    implicitType: true,
    default: undefined,
    enum: [],
  };
};
export const makePointer = (...args: any[]) => {
  if (!args[0].startsWith(ROOT_POINTER)) {
    args.unshift(ROOT_POINTER);
  }
  return args.join('/');
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

export const getParentNodeByPointer = (uiSchemaNodes: UiSchemaNodes, pointer: string): UiSchemaNode | undefined => {
  const pointerParts = pointer.split('/');
  while (pointerParts.length) {
    pointerParts.pop();
    const parentNodeIndex = getNodeIndexByPointer(uiSchemaNodes, pointerParts.join('/'));
    if (parentNodeIndex !== undefined) {
      return uiSchemaNodes[parentNodeIndex];
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

export const pointerIsDefinition = (pointer: string) => pointer.startsWith(makePointer(Keywords.Definitions));

export const deepCopy = (value: any) => JSON.parse(JSON.stringify(value));

export const pointerReplacer = (node: UiSchemaNode, oldPointer: string, newPointer: string): UiSchemaNode => {
  const nodeCopy: UiSchemaNode = deepCopy(node);
  nodeCopy.pointer = nodeCopy.pointer.replace(oldPointer, newPointer);
  nodeCopy.ref = nodeCopy.ref !== undefined ? nodeCopy.ref.replace(oldPointer, newPointer) : undefined;
  nodeCopy.children = nodeCopy.children.map((p) => p.replace(oldPointer, newPointer));
  return nodeCopy;
};

export const sortNodesByChildren = (uiSchemaNodes: UiSchemaNodes): UiSchemaNodes => {
  const tempMap = new Map();
  uiSchemaNodes.forEach((node) => tempMap.set(node.pointer, node));
  return treeWalker(tempMap, ROOT_POINTER);
};

const treeWalker = (map: Map<string, UiSchemaNode>, pointer: string): UiSchemaNodes => {
  const nodes = [];
  if (map.has(pointer)) {
    const currentNode = map.get(pointer) as UiSchemaNode;
    nodes.push(currentNode);
    currentNode.children.forEach((childPointer) => nodes.push(...treeWalker(map, childPointer)));
  } else {
    throw new Error(`Can't find ${pointer} in node-array.`);
  }
  return nodes;
};
