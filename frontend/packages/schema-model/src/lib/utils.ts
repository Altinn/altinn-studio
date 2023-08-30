import type { UiSchemaNode, UiSchemaNodes } from '../types';
import { CombinationKind, FieldType, Keyword, ObjectKind } from '../types';
import { hasNodePointer } from './selectors';
import { ROOT_POINTER } from './constants';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const createNodeBase = (...args: string[]): UiSchemaNode => ({
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  pointer: makePointer(...args),
  isRequired: false,
  isNillable: false,
  isCombinationItem: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
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
  pointer.startsWith(makePointer(Keyword.Definitions)) && !pointer.includes(Keyword.Properties);

export const combinationIsNullable = (childNodes: UiSchemaNode[]): boolean =>
  childNodes.some((child) => child.fieldType === FieldType.Null);

export const getNameFromPointer = ({ pointer }: { pointer: string }) =>
  pointer.split('/').pop() ?? '';

export const getUniqueNodePath = (uiNodeMap: UiSchemaNodes, targetPointer: string): string => {
  let newPointer = targetPointer;
  let postfix = 0;
  while (hasNodePointer(uiNodeMap, newPointer)) {
    newPointer = targetPointer + postfix;
    postfix++;
  }
  return newPointer;
};

/**
 * Checks if the model is empty (contains only the root node).
 * @param model The model to check.
 * @returns True if the model is empty, false otherwise.
 */
export const isEmpty = (model: UiSchemaNodes) => !model || model.length < 2;
