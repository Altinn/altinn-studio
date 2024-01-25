import type { UiSchemaNode, UiSchemaNodes } from '../types';
import { CombinationKind, FieldType, Keyword, ObjectKind } from '../types';
import { hasNodePointer } from './selectors';
import { ROOT_POINTER } from './constants';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FieldNode } from '../types/FieldNode';
import type { CombinationNode } from '../types/CombinationNode';
import type { ReferenceNode } from '../types/ReferenceNode';
import { makePointerFromArray } from './pointerUtils';

export const createNodeBase = (...args: string[]): FieldNode => ({
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  pointer: makePointerFromArray(args),
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
  implicitType: true,
  default: undefined,
  enum: [],
});

export const getCombinationKind = (schemaNode: KeyValuePairs): CombinationKind => {
  const kinds = Object.values(CombinationKind).filter((k) => Object.keys(schemaNode).includes(k));
  return kinds[0];
};

export const getObjectKind = (schemaNode: KeyValuePairs): ObjectKind => {
  if (schemaNode.$ref !== undefined) {
    return ObjectKind.Reference;
  } else if (getCombinationKind(schemaNode)) {
    return ObjectKind.Combination;
  } else {
    return ObjectKind.Field;
  }
};

export const schemaTypeIncludes = (schemaNodeType: string | string[], type: FieldType): boolean =>
  schemaNodeType === type || (Array.isArray(schemaNodeType) && schemaNodeType.includes(type));

export const schemaTypeIsNillable = (schemaNodeType: string | string[]): boolean =>
  schemaNodeType !== FieldType.Null && schemaTypeIncludes(schemaNodeType, FieldType.Null);

export const splitPointerInBaseAndName = (pointer: string) => {
  const parts = pointer.split('/');
  return {
    name: parts.pop(),
    base: parts.join('/'),
  };
};
export const replaceLastPointerSegment = (pointer: string, newLastSegment: string): string => {
  const { base } = splitPointerInBaseAndName(pointer);
  return [base, newLastSegment].join('/');
};

export const pointerIsDefinition = (pointer: string) =>
  pointer.startsWith(makePointerFromArray([Keyword.Definitions])) &&
  !pointer.includes(Keyword.Properties);

export const combinationIsNullable = (childNodes: UiSchemaNode[]): boolean =>
  childNodes.some(
    (child) => child.objectKind === ObjectKind.Field && child.fieldType === FieldType.Null,
  );

export const getUniqueNodePath = (uiNodeMap: UiSchemaNodes, targetPointer: string): string => {
  let newPointer = targetPointer;
  let postfix = 0;
  while (hasNodePointer(uiNodeMap, newPointer)) {
    newPointer = targetPointer + postfix;
    postfix++;
  }
  return newPointer;
};

export const isField = (node: UiSchemaNode): node is FieldNode =>
  node.objectKind === ObjectKind.Field;

export const isObject = (node: FieldNode): boolean => node.fieldType === FieldType.Object;

export const isArray = (node: UiSchemaNode): boolean => node.isArray;

export const isCombination = (node: UiSchemaNode): node is CombinationNode =>
  node.objectKind === ObjectKind.Combination;

export const isReference = (node: UiSchemaNode): node is ReferenceNode =>
  node.objectKind === ObjectKind.Reference;

export const isFieldOrCombination = (node: UiSchemaNode): node is FieldNode | CombinationNode =>
  isField(node) || isCombination(node);

export const isDefinition = (node: UiSchemaNode): boolean =>
  node.pointer.startsWith(makePointerFromArray([Keyword.Definitions]));

export const isProperty = (node: UiSchemaNode): boolean => !isDefinition(node);

export const isNodeValidParent = (node: UiSchemaNode): boolean =>
  isCombination(node) || (isField(node) && isObject(node));

export const isTheRootNode = (node: UiSchemaNode): boolean => node.pointer === ROOT_POINTER;

export const isNotTheRootNode = (node: UiSchemaNode): boolean => !isTheRootNode(node);
