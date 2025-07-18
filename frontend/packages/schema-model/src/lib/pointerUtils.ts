import type { UiSchemaNode } from '../types';
import { CombinationKind, Keyword, ObjectKind } from '../types';
import type { FieldNode } from '../types/FieldNode';
import type { CombinationNode } from '../types/CombinationNode';
import type { PointerCategory } from '../types/PointerCategory';
import type { ItemCategory } from '../types/ItemCategory';
import { ROOT_POINTER } from './constants';
import { isNodeValidParent } from './utils';

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

export const extractCategoryFromPointer = (pointer: string): PointerCategory | undefined => {
  const arrayCategory: Keyword.Items | null = extractArrayCategoryFromPointer(pointer);
  const itemCategory: ItemCategory | null = extractItemCategoryFromPointer(pointer);
  const categories = [arrayCategory, itemCategory].filter((c) => !!c);
  const superCategory = categories.join('/');
  return isValidPointerCategory(superCategory) ? superCategory : undefined;
};

export const extractItemCategoryFromPointer = (pointer: string): ItemCategory => {
  const parts = pointer.split('/');
  const category = parts[parts.length - 2];
  switch (category) {
    case Keyword.Properties:
    case Keyword.Definitions:
    case CombinationKind.AllOf:
    case CombinationKind.AnyOf:
    case CombinationKind.OneOf:
      return category;
    default:
      return undefined;
  }
};

const extractArrayCategoryFromPointer = (pointer: string): Keyword.Items | null => {
  const categoryPositionFromEnd = 3;
  const category = getPointerPartCategory(pointer, categoryPositionFromEnd);
  return category === Keyword.Items ? Keyword.Items : null;
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
): string | null => {
  const parts = pointer.split('/');
  const index = parts.length - categoryPositionFromEnd;
  return index >= 0 ? parts[index] : null;
};

const isValidPointerCategory = (value: string): value is PointerCategory => {
  const validCategories: Set<string> = new Set([
    Keyword.Properties,
    Keyword.Definitions,
    Keyword.Items,
    `${Keyword.Items}/${Keyword.Properties}`,
    `${Keyword.Items}/${CombinationKind.AllOf}`,
    `${Keyword.Items}/${CombinationKind.AnyOf}`,
    `${Keyword.Items}/${CombinationKind.OneOf}`,
    CombinationKind.AllOf,
    CombinationKind.AnyOf,
    CombinationKind.OneOf,
  ]);
  return validCategories.has(value);
};
