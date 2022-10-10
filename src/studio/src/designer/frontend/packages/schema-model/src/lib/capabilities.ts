import { Capabilites, FieldType, ObjectKind, ROOT_POINTER, UiSchemaNode } from './types';

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
