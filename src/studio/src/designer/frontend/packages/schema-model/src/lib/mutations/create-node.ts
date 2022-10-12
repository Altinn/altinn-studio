import { FieldType, Keywords, ObjectKind, UiSchemaNode, UiSchemaNodes } from '../types';
import { createNodeBase, pointerExists } from '../utils';
import { getParentNodeByPointer } from '../selectors';

export const insertSchemaNode = (uiSchemaNodes: UiSchemaNodes, newNode: UiSchemaNode): UiSchemaNodes => {
  if (pointerExists(uiSchemaNodes, newNode.pointer)) {
    throw new Error(`Pointer ${newNode.pointer} exists allready`);
  }
  const mutatedNodeArray: UiSchemaNodes = JSON.parse(JSON.stringify(uiSchemaNodes));
  const parentNode = getParentNodeByPointer(mutatedNodeArray, newNode.pointer);
  if (!parentNode) {
    throw new Error(`Can't find ParentNode for pointer ${newNode.pointer}`);
  }
  parentNode.children.push(newNode.pointer);
  mutatedNodeArray.push(newNode);
  return mutatedNodeArray;
};

/**
 * Creates a new
 *
 * @param parentNode
 * @param displayName
 * @param isDefinition
 */
export const createChildNode = (parentNode: UiSchemaNode, displayName: string, isDefinition: boolean): UiSchemaNode => {
  const { pointer, objectKind, children, fieldType } = parentNode;
  if (objectKind === ObjectKind.Array) {
    throw new Error("This application doesn't support combined array types.");
  } else if (objectKind === ObjectKind.Reference && fieldType !== FieldType.Object) {
    throw new Error("Can't create a new node under a reference.");
  } else if (objectKind === ObjectKind.Combination) {
    return Object.assign(createNodeBase(pointer, fieldType, children.length.toString()), {
      isCombinationItem: true,
    });
  } else if (fieldType === FieldType.Object && isDefinition) {
    return createNodeBase(pointer, Keywords.Definitions, displayName);
  } else if (fieldType === FieldType.Object && !isDefinition) {
    return createNodeBase(pointer, Keywords.Properties, displayName);
  } else if (objectKind === ObjectKind.Field) {
    throw new Error(`Can't add node to fieldtype ${fieldType}`);
  } else {
    throw new Error('invalid parent node');
  }
};
