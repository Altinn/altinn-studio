import type { UiSchemaNode } from '../types';
import { CombinationKind, Keyword, ObjectKind } from '../types';

import { ROOT_POINTER } from './constants';
import type { FieldNode } from '../types/FieldNode';
import type { CombinationNode } from '../types/CombinationNode';
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

export const extractCategoryFromPointer = (
  pointer: string,
): Keyword.Properties | Keyword.Definitions | CombinationKind | undefined => {
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

export const extractItemsFromPointer = (pointer: string): Keyword.Items | undefined => {
  const parts = pointer.split('/');
  const category = parts[parts.length - 2];
  return category === Keyword.Items ? Keyword.Items : undefined;
};

export const changeNameInPointer = (pointer: string, newName: string): string => {
  const parts = pointer.split('/');
  parts.pop();
  parts.push(newName);
  return parts.join('/');
};
