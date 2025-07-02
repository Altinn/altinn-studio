import type { UiSchemaNode } from '../types';
import { CombinationKind, Keyword, ObjectKind } from '../types';

import { ROOT_POINTER } from './constants';
import type { FieldNode } from '../types/FieldNode';
import type { CombinationNode } from '../types/CombinationNode';
import { isNodeValidParent } from './utils';
import { ValidPointerCategory } from '@altinn/schema-model/types/ValidPointerCategory';

export const createDefinitionPointer = (name: string): string =>
  makePointerFromArray([Keyword.Definitions, name]);

export const createPropertyPointer = (parentNode: UiSchemaNode, name: string): string => {
  if (!isNodeValidParent(parentNode)) {
    throw new Error(`The node ${parentNode.schemaPointer} is not a valid parent node.`);
  }
  const pointerBase = createPointerBase(parentNode as FieldNode | CombinationNode);
  return makePointerFromArray([pointerBase, name]);
};

const createPointerBase = (parentNode: FieldNode | CombinationNode): string => {
  switch (parentNode.objectKind) {
    case ObjectKind.Field:
      return parentNode.isArray
        ? makePointerFromArray([parentNode.schemaPointer, Keyword.Items, Keyword.Properties])
        : makePointerFromArray([parentNode.schemaPointer, Keyword.Properties]);
    case ObjectKind.Combination:
      return parentNode.isArray
        ? makePointerFromArray([
            parentNode.schemaPointer,
            Keyword.Items,
            parentNode.combinationType,
          ])
        : makePointerFromArray([parentNode.schemaPointer, parentNode.combinationType]);
  }
};

export const makePointerFromArray = (array: string[]): string => {
  if (!array[0].startsWith(ROOT_POINTER)) {
    array.unshift(ROOT_POINTER);
  }
  return array.join('/');
};

export const extractNameFromPointer = (pointer: string): string => {
  const parts = pointer.split('/');
  return parts.pop();
};

export const extractCategoryFromPointer = (pointer: string): ValidPointerCategory | undefined => {
  const category: ValidPointerCategory =
    extractItemsCategory(pointer) ||
    constructItemsCategoryPath(pointer) ||
    getPointerPartCategory(pointer);

  if (category && isValidPointerCategory(category)) {
    return category;
  }
  return undefined;
};

const constructItemsCategoryPath = (pointer: string): string | undefined => {
  const category = getPointerPartCategory(pointer);
  return category === Keyword.Items ? `${Keyword.Items}/${Keyword.Properties}` : undefined;
};

const extractItemsCategory = (pointer: string): string | undefined => {
  const categoryPositionFromEnd = 3;
  const category = getPointerPartCategory(pointer, categoryPositionFromEnd);
  return category === Keyword.Items ? Keyword.Items : undefined;
};

export const changeNameInPointer = (pointer: string, newName: string): string => {
  const parts = pointer.split('/');
  parts.pop();
  parts.push(newName);
  return parts.join('/');
};

const getPointerPartCategory = (
  pointer: string,
  categoryPositionFromEnd: number = 2,
): string | undefined => {
  const parts = pointer.split('/');
  const index = parts.length - categoryPositionFromEnd;
  return index >= 0 ? parts[index] : undefined;
};

const isValidPointerCategory = (value: string): value is ValidPointerCategory => {
  const validCategories: Set<string> = new Set([
    Keyword.Properties,
    Keyword.Definitions,
    Keyword.Items,
    `${Keyword.Items}/${Keyword.Properties}`,
    CombinationKind.AllOf,
    CombinationKind.AnyOf,
    CombinationKind.OneOf,
  ]);
  return validCategories.has(value);
};
