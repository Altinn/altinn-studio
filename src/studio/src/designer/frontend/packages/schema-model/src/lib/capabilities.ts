import type { UiSchemaNode } from './types';
import { FieldType, ObjectKind, ROOT_POINTER } from './types';

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
  const { objectKind, fieldType } = node;
  const output = [];
  const isRootNode = node.pointer === ROOT_POINTER;
  const hasRestrictions = Object.keys(node.restrictions).length > 0;
  const hasChildren = node.children.length > 0;

  if (objectKind === ObjectKind.Field || objectKind === ObjectKind.Reference) {
    output.push(Capabilites.CanBeConvertedToArray);
  }
  if (
    (objectKind === ObjectKind.Reference && node.ref) ||
    (objectKind === ObjectKind.Array && !hasRestrictions) ||
    (objectKind === ObjectKind.Combination && !hasChildren)
  ) {
    output.push(Capabilites.CanBeConvertedToField);
  }

  if (objectKind === ObjectKind.Array || objectKind === ObjectKind.Field) {
    output.push(Capabilites.CanBeConvertedToReference);
  }

  if (objectKind === ObjectKind.Field && fieldType === FieldType.Object) {
    output.push(Capabilites.CanHaveFieldAdded, Capabilites.CanHaveReferenceAdded);
  }

  if (objectKind === ObjectKind.Combination) {
    output.push(Capabilites.CanHaveReferenceAdded);
  }

  if (objectKind !== ObjectKind.Reference && fieldType === FieldType.Object) {
    output.push(Capabilites.CanHaveCombinationAdded);
  }

  if (!isRootNode) {
    output.push(Capabilites.CanBeDeleted);
  }

  return output;
};
