import type { UiSchemaNode, UiSchemaNodes } from './types';
import { CombinationKind, FieldType, Keywords, ObjectKind } from './types';
import {
  createNodeBase,
  getParentNodeByPointer,
  makePointer,
  pointerIsDefinition,
  splitPointerInBaseAndName,
} from './utils';
import { getNodeByPointer, getNodeIndexByPointer, getUniqueNodePath, pointerExists } from './selectors';

// Changes to the uiNodeMap
export const removeItemByPointer = (uiNodeMap: UiSchemaNodes, pointer: string) => {
  let mutatedUiNodeMap: UiSchemaNodes = [...uiNodeMap];
  // Remove the child node pointer from the parent
  const uiSchemaNode = getNodeIndexByPointer(mutatedUiNodeMap, pointer);
  if (!uiSchemaNode) {
    throw new Error(`Can't remove ${pointer}, doesn't exist`);
  }
  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, pointer);
  if (parentNode) {
    parentNode.children = parentNode.children.filter((childPointer) => pointer !== childPointer);
  } else {
    throw new Error(`Can't find ParentNode for pointer ${pointer}`);
  }

  // Remove itself decendants... just using the pointer
  mutatedUiNodeMap = mutatedUiNodeMap.filter((uiNode: UiSchemaNode) => !uiNode.pointer.startsWith(pointer));

  // dealing with combinations, updating their children is a little more tricky.
  if (parentNode.objectKind === ObjectKind.Combination) {
    parentNode.children.forEach((oldPointerBase, index) => {
      const { base } = splitPointerInBaseAndName(oldPointerBase);
      const newPointerBase = [base, index].join('/');
      if (oldPointerBase !== newPointerBase) {
        mutatedUiNodeMap.forEach((uiNode) => {
          uiNode.pointer = uiNode.pointer.replace(oldPointerBase, newPointerBase);
          uiNode.children = uiNode.children.map((p) => p.replace(oldPointerBase, newPointerBase));
        });
      }
    });
  }
  return mutatedUiNodeMap;
};

export const renameItemPointer = (uiSchemaNodes: UiSchemaNodes, oldPointer: string, newPointer: string) => {
  if (oldPointer === newPointer) {
    throw new Error('Old and new name is equal');
  }

  if (!pointerExists(uiSchemaNodes, oldPointer)) {
    const { base, name } = splitPointerInBaseAndName(oldPointer);
    if (Object.values(CombinationKind).includes(name as CombinationKind) && getNodeByPointer(uiSchemaNodes, base)) {
      // Its a valid combo-item... just continue.
    } else {
      throw new Error(`Can't rename pointer ${oldPointer}, it doesn't exist`);
    }
  }
  const mutatedNodeArray: UiSchemaNodes = [];
  uiSchemaNodes.forEach((uiNode) => {
    const nodeCopy = Object.assign({}, uiNode);
    if (uiNode.pointer.startsWith(oldPointer)) {
      nodeCopy.pointer = nodeCopy.pointer.replace(oldPointer, newPointer);
    }
    if (nodeCopy.ref && nodeCopy.ref.startsWith(oldPointer)) {
      nodeCopy.ref = nodeCopy.ref.replace(oldPointer, newPointer);
    }
    nodeCopy.children = uiNode.children.map((p) => p.replace(oldPointer, newPointer));
    mutatedNodeArray.push(nodeCopy);
  });
  return mutatedNodeArray;
};

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
  newNode.implicitType = false;
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

export const promotePropertyToType = (uiSchemaNodes: UiSchemaNodes, pointer: string) => {
  if (pointerIsDefinition(pointer)) {
    throw new Error(`Pointer ${pointer}, is already a definition.`);
  }
  const uiNode = getNodeByPointer(uiSchemaNodes, pointer);
  if (uiNode.objectKind === ObjectKind.Reference) {
    throw new Error(`Pointer ${pointer}, is already a reference.`);
  }

  const displayName = pointer.split('/').pop();
  const newPointer = getUniqueNodePath(uiSchemaNodes, makePointer(Keywords.Definitions, displayName));
  const updatedUiNodeMap = renameItemPointer(uiSchemaNodes, pointer, newPointer);
  const simpleRefNode = createNodeBase(pointer);
  simpleRefNode.objectKind = ObjectKind.Reference;
  simpleRefNode.ref = newPointer;
  updatedUiNodeMap.push(simpleRefNode);
  return updatedUiNodeMap;
};
