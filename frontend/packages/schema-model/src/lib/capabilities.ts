import type { UiSchemaNode } from '../types';
import { ObjectKind } from '../types';
import { ROOT_POINTER } from './constants';
import {
  isCombination,
  isField,
  isFieldOrCombination,
  isObject,
  isReference,
  pointerIsDefinition,
} from './utils';

export enum Capabilites {
  CanBeConvertedToArray = 'CAN_BE_CONVERTED_TO_ARRAY', // no restrictions, not combination
  CanBeConvertedToCombination = 'CAN_BE_CONVERTED_TO_COMBINATION',
  CanBeConvertedToField = 'CAN_BE_CONVERTED_TO_FIELD', // reference or array with no restrictions
  CanBeConvertedToReference = 'CAN_BE_CONVERTED_TO_REFERENCE',
  CanBeDeleted = 'CAN_BE_DELETED', // not root node
  CanHaveCombinationAdded = 'CAN_HAVE_COMBINATION_ADDED', // object or root node
  CanHaveFieldAdded = 'CAN_HAVE_FIELD_ADDED', // object or combination
  CanHaveReferenceAdded = 'CAN_HAVE_REFERENCE_ADDED', // object or combination
}

export const getCapabilities = (node: UiSchemaNode): Capabilites[] => {
  const { objectKind, isArray } = node;
  const output = [];
  const isRootNode = node.pointer === ROOT_POINTER;
  const hasRestrictions = Object.keys(node.restrictions).length > 0;
  const hasChildren = isFieldOrCombination(node) && node.children.length > 0;

  if (objectKind === ObjectKind.Field || objectKind === ObjectKind.Reference) {
    output.push(Capabilites.CanBeConvertedToArray);
  }
  if (isReference(node) || (isArray && !hasRestrictions) || (isCombination(node) && !hasChildren)) {
    output.push(Capabilites.CanBeConvertedToField);
  }

  if (!pointerIsDefinition(node.pointer)) {
    output.push(Capabilites.CanBeConvertedToReference);
  }

  if (isField(node) && isObject(node)) {
    output.push(Capabilites.CanHaveFieldAdded, Capabilites.CanHaveReferenceAdded);
    output.push(Capabilites.CanHaveCombinationAdded);
  }

  if (isCombination(node)) {
    output.push(Capabilites.CanHaveReferenceAdded);
  }

  if (!isRootNode) {
    output.push(Capabilites.CanBeDeleted);
  }

  return output;
};
