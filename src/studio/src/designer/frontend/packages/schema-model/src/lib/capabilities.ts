import { Capabilites, FieldType, ObjectKind, ROOT_POINTER, UiSchemaNode } from './types';

export const getCapabilities = (node: UiSchemaNode): Capabilites[] => {
  const { objectKind, fieldType } = node;
  const capabilities = [];
  const isRootNode = node.pointer === ROOT_POINTER;
  const hasRestrictions = Object.keys(node.restrictions).length > 0;
  const hasChildren = node.children.length > 0;
  if (objectKind === ObjectKind.Field || objectKind === ObjectKind.Reference) {
    capabilities.push(Capabilites.CanBeConvertedToArray);
  }

  if (
    objectKind === ObjectKind.Reference ||
    (objectKind === ObjectKind.Array && !hasRestrictions) ||
    (fieldType === FieldType.Object && !hasRestrictions && !hasChildren)
  ) {
    capabilities.push(Capabilites.CanBeConvertedToField);
  }

  if (fieldType === FieldType.Object || ObjectKind.Combination) {
    capabilities.push(Capabilites.CanHaveFieldAdded, Capabilites.CanHaveReferenceAdded);
  }
  if (fieldType === FieldType.Object) {
    capabilities.push(Capabilites.CanHaveCombinationAdded);
  }

  if (!isRootNode) {
    capabilities.push(Capabilites.CanBeDeleted);
  }

  return capabilities;
};
