import {
  CombinationKind,
  FieldType,
  Keywords,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaMap,
  UiSchemaNode,
} from './types';
import {
  cloneMap,
  createNodeBase,
  getParentNodeByPointer,
  splitPointerInBaseAndName,
} from './utils';
import { getNodeByPointer, getUniqueNodePath } from './selectors';

// Changes to the uiNodeMap
export const removeItemByPointer = (uiNodeMap: UiSchemaMap, pointer: string) => {
  let mutatedUiNodeMap: UiSchemaMap = cloneMap(uiNodeMap) as UiSchemaMap;
  if (!uiNodeMap.has(pointer)) {
    throw new Error(`Can't remove ${pointer}, doesn't exist`);
  }

  // Remove the child node pointer from the parent
  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, pointer);
  if (parentNode) {
    parentNode.children = parentNode.children.filter((childPointer) => pointer !== childPointer);
  } else {
    throw new Error(`Can't find ParentNode for pointer ${pointer}`);
  }

  // Remove itself decendants... just using the pointer
  mutatedUiNodeMap.forEach((uiNode: UiSchemaNode, nodePointer: string) => {
    if (uiNode.pointer.startsWith(pointer)) {
      mutatedUiNodeMap.delete(nodePointer);
    }
  });

  // dealing with combinations, updating their children is a little bit more tricky.
  if (parentNode.objectKind === ObjectKind.Combination) {
    parentNode.children.forEach((oldPointerBase, index) => {
      const { base } = splitPointerInBaseAndName(oldPointerBase);
      const newPointerBase = [base, index].join('/');
      if (oldPointerBase !== newPointerBase) {
        mutatedUiNodeMap.forEach((uiNode, oldChildPointer) => {
          uiNode.pointer = oldChildPointer.replace(oldPointerBase, newPointerBase);
          uiNode.children = uiNode.children.map((p) => p.replace(oldPointerBase, newPointerBase));
          if (uiNode.pointer !== oldChildPointer) {
            // Need to move the node, it have a new pointer.
            mutatedUiNodeMap.set(uiNode.pointer, { ...uiNode });
            mutatedUiNodeMap.delete(oldChildPointer);
          }
        });
      }
    });
  }
  return mutatedUiNodeMap;
};

export const renameItemPointer = (
  uiNodeMap: UiSchemaMap,
  oldPointer: string,
  newPointer: string,
) => {
  if (oldPointer === newPointer) {
    throw new Error('Old and new name is equal');
  }

  if (!uiNodeMap.has(oldPointer)) {
    const { base, name } = splitPointerInBaseAndName(oldPointer);
    if (Object.values(CombinationKind).includes(name as CombinationKind) && uiNodeMap.has(base)) {
      // Its a valid combo-item... just continue.
    } else {
      throw new Error(`Can't rename pointer ${oldPointer}, it doesn't exist`);
    }
  }

  const mutatedUiNodeMap: UiSchemaMap = new Map();
  uiNodeMap.forEach((uiNode: UiSchemaNode, uiNodePointer: string) => {
    const nodeCopy = Object.assign({}, uiNode);
    if (uiNodePointer.startsWith(oldPointer)) {
      nodeCopy.pointer = nodeCopy.pointer.replace(oldPointer, newPointer);
    }
    if (nodeCopy.ref && nodeCopy.ref.startsWith(oldPointer)) {
      nodeCopy.ref = nodeCopy.ref.replace(oldPointer, newPointer);
    }
    nodeCopy.children = uiNode.children.map((p) => p.replace(oldPointer, newPointer));
    mutatedUiNodeMap.set(nodeCopy.pointer, nodeCopy);
  });
  return mutatedUiNodeMap;
};

export const insertNodeToMap = (uiNodeMap: UiSchemaMap, newNode: UiSchemaNode) => {
  if (uiNodeMap.has(newNode.pointer)) {
    throw new Error(`Pointer ${newNode.pointer} exists allready`);
  }
  const mutatedUiNodeMap: UiSchemaMap = cloneMap(uiNodeMap) as UiSchemaMap;
  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, newNode.pointer);
  if (!parentNode) {
    throw new Error(`Can't find ParentNode for pointer ${newNode.pointer}`);
  }
  parentNode.children.push(newNode.pointer);
  return mutatedUiNodeMap.set(newNode.pointer, newNode);
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

export const promotePropertyToType = (uiNodeMap: UiSchemaMap, pointer: string) => {
  if (!uiNodeMap.has(pointer)) {
    throw new Error(`Can't promote ${pointer}, it doesn't exist`);
  }
  const uiNode = getNodeByPointer(uiNodeMap, pointer);
  if (uiNode.objectKind === ObjectKind.Reference) {
    throw new Error(`Pointer ${pointer}, is already a reference.`);
  }
  const displayName = pointer.split('/').pop();
  const newPointer = getUniqueNodePath(
    uiNodeMap,
    [ROOT_POINTER, Keywords.Definitions, displayName].join('/'),
  );
  const updatedUiNodeMap = renameItemPointer(uiNodeMap, pointer, newPointer);
  const simpleRefNode = createNodeBase(pointer);
  simpleRefNode.objectKind = ObjectKind.Reference;
  simpleRefNode.ref = newPointer;
  updatedUiNodeMap.set(pointer, simpleRefNode);
  return updatedUiNodeMap;
};
