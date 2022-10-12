import type { JsonSchemaNode, UiSchemaNode, UiSchemaNodes } from './types';
import { CombinationKind, FieldType, Keywords, ObjectKind } from './types';
import { getNodeIndexByPointer } from './selectors';
import { ROOT_POINTER } from './constants';
import { deepCopy } from 'app-shared/pure';

export const createNodeBase = (...args: string[]): UiSchemaNode => ({
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
});

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

export const schemaTypeIncludes = (schemaNodeType: string | string[], type: FieldType): boolean =>
  schemaNodeType === type || (Array.isArray(schemaNodeType) && schemaNodeType.includes(type));

export const schemaTypeIsNillable = (schemaNodeType: string | string[]): boolean =>
  schemaNodeType !== FieldType.Null && schemaTypeIncludes(schemaNodeType, FieldType.Null);

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

export const pointerIsDefinition = (pointer: string) => pointer.startsWith(makePointer(Keywords.Definitions));

export const pointerReplacer = (node: UiSchemaNode, oldPointer: string, newPointer: string): UiSchemaNode => {
  const nodeCopy: UiSchemaNode = deepCopy(node);
  nodeCopy.pointer = nodeCopy.pointer.replace(oldPointer, newPointer);
  nodeCopy.ref = nodeCopy.ref !== undefined ? nodeCopy.ref.replace(oldPointer, newPointer) : undefined;
  nodeCopy.children = nodeCopy.children.map((p) => p.replace(oldPointer, newPointer));
  return nodeCopy;
};

export const pointerExists = (uiSchemaNodes: UiSchemaNodes, pointer: string): boolean =>
  getNodeIndexByPointer(uiSchemaNodes, pointer) !== undefined;

export const combinationIsNullable = (childNodes: UiSchemaNode[]): boolean =>
  childNodes.some((child) => child.fieldType === FieldType.Null);

export const getNodeDisplayName = (uiSchemaNode: UiSchemaNode) => uiSchemaNode.pointer.split('/').pop() ?? '';

export const getUniqueNodePath = (uiNodeMap: UiSchemaNodes, targetPointer: string): string => {
  let newPointer = targetPointer;
  let postfix = 0;
  while (pointerExists(uiNodeMap, newPointer)) {
    newPointer = targetPointer + postfix;
    postfix++;
  }
  return newPointer;
};
