import type { UiSchemaNode } from '../types';
import { Keyword, ObjectKind } from '../types';
import { ROOT_POINTER } from './constants';
import type { FieldNode } from '../types/FieldNode';
import type { CombinationNode } from '../types/CombinationNode';
import { isNodeValidParent } from './utils';

export const createDefinitionPointer = (name: string): string =>
  makePointerFromArray([Keyword.Definitions, name]);

export const createPropertyPointer = (parentNode: UiSchemaNode, name: string): string => {
  if (!isNodeValidParent(parentNode)) {
    throw new Error(`The node ${parentNode.pointer} is not a valid parent node.`);
  }
  const pointerBase = createPointerBase(parentNode as FieldNode | CombinationNode);
  return makePointerFromArray([pointerBase, name]);
};

const createPointerBase = (parentNode: FieldNode | CombinationNode): string => {
  switch (parentNode.objectKind) {
    case ObjectKind.Field:
      return parentNode.isArray
        ? makePointerFromArray([parentNode.pointer, Keyword.Items, Keyword.Properties])
        : makePointerFromArray([parentNode.pointer, Keyword.Properties]);
    case ObjectKind.Combination:
      return parentNode.isArray
        ? makePointerFromArray([parentNode.pointer, Keyword.Items, parentNode.combinationType])
        : makePointerFromArray([parentNode.pointer, parentNode.combinationType]);
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

export const changeNameInPointer = (pointer: string, newName: string): string => {
  const parts = pointer.split('/');
  parts.pop();
  parts.push(newName);
  return parts.join('/');
};
