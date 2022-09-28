import { FieldType, Keywords, ObjectKind, UiSchemaMap, UiSchemaNode } from './types';
import {
  cloneMap,
  createNodeBase,
  createPointerLookupTable,
  getParentNodeByPointer,
} from './utils';

// Changes to the uiNodeMap
export const removeItemByPointer = (uiNodeMap: UiSchemaMap, pointer: string) => {
  const mutatedUiNodeMap: UiSchemaMap = cloneMap(uiNodeMap) as UiSchemaMap;
  const lookup = createPointerLookupTable(mutatedUiNodeMap);
  if (!lookup.has(pointer)) {
    throw new Error(`Can't remove ${pointer}, doesn't exist`);
  }

  // Remove the child node id from the parent
  const childNodeId = lookup.get(pointer) as number;
  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, pointer);
  if (parentNode) {
    parentNode.children = parentNode.children.filter((nodeId) => nodeId !== childNodeId);
  } else {
    throw new Error(`Can't find ParentNode for pointer ${pointer}`);
  }

  // Remove itself decendants... just using the pointer
  mutatedUiNodeMap.forEach((uiNode: UiSchemaNode, key: number) => {
    if (uiNode.pointer.startsWith(pointer)) {
      mutatedUiNodeMap.delete(key);
    }
  });

  return mutatedUiNodeMap;
};

export const renameItemPointer = (
  uiNodeMap: UiSchemaMap,
  oldPointer: string,
  newPointer: string,
) => {
  // some assertsions before.
  if (oldPointer === newPointer) {
    throw new Error('Old and new name is equal');
  }
  const oldPointerParts = oldPointer.split('/');
  const newPointerParts = newPointer.split('/');
  if (oldPointerParts.length !== newPointerParts.length) {
    throw new Error('Refuses to move node between');
  }
  let changeCount = 0;
  oldPointerParts.forEach((part, index) => {
    if (newPointerParts[index] !== part) {
      changeCount++;
    }
  });
  if (changeCount !== 1) {
    throw new Error('Refusing to change more than one part of the pointer');
  }
  const mutatedUiNodeMap: UiSchemaMap = new Map();
  uiNodeMap.forEach((uiNode: UiSchemaNode, key: number) => {
    const nodeCopy = { ...uiNode };
    if (nodeCopy.pointer.startsWith(oldPointer)) {
      nodeCopy.pointer = nodeCopy.pointer.replace(oldPointer, newPointer);
    }
    mutatedUiNodeMap.set(key, nodeCopy);
  });
  return mutatedUiNodeMap;
};

export const insertNodeToMap = (uiNodeMap: UiSchemaMap, newNode: UiSchemaNode) => {
  const lookup = createPointerLookupTable(uiNodeMap);
  if (lookup.has(newNode.pointer)) {
    throw new Error(`Pointer ${newNode.pointer} exists allready`);
  }
  const mutatedUiNodeMap: UiSchemaMap = cloneMap(uiNodeMap) as UiSchemaMap;
  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, newNode.pointer);
  if (!parentNode) {
    throw new Error(`Can't find ParentNode for pointer ${newNode.pointer}`);
  }
  parentNode.children.push(newNode.nodeId);
  return mutatedUiNodeMap.set(newNode.nodeId, newNode);
};

/**
 * Creates a new
 *
 * @param parentNode
 * @param displayName
 * @param isDefinition
 */
export const createChildNode = (
  parentNode: UiSchemaNode,
  displayName: string,
  isDefinition: boolean,
): UiSchemaNode => {
  const { pointer, objectKind, children, fieldType } = parentNode;
  if (objectKind === ObjectKind.Array) {
    throw new Error("This application doesn't support combined array types.");
  } else if (objectKind === ObjectKind.Reference && fieldType !== FieldType.Object) {
    throw new Error("Can't create a new node under a reference.");
  } else if (objectKind === ObjectKind.Combination) {
    return createNodeBase(pointer, fieldType, children.length.toString());
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
