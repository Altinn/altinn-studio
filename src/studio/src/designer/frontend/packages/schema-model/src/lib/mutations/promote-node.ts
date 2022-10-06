import { Keywords, ObjectKind, UiSchemaNodes } from '../types';
import { createNodeBase, deepCopy, getParentNodeByPointer, makePointer, pointerIsDefinition } from '../utils';
import { getNodeIndexByPointer, getUniqueNodePath } from '../selectors';
import { renameNodePointer } from './rename-node';

export const promotePropertyToType = (uiSchemaNodes: UiSchemaNodes, pointer: string) => {
  if (pointerIsDefinition(pointer)) {
    throw new Error(`Pointer ${pointer}, is already a definition.`);
  }
  const uiNodeIndex = getNodeIndexByPointer(uiSchemaNodes, pointer);
  if (uiNodeIndex === undefined) {
    throw new Error(`Pointer ${pointer}, can't be found.`);
  }
  const uiNode = uiSchemaNodes[uiNodeIndex];
  if (uiNode.objectKind === ObjectKind.Reference) {
    throw new Error(`Pointer ${pointer}, is already a reference.`);
  }

  const promotedNodePointer = getUniqueNodePath(
    uiSchemaNodes,
    makePointer(Keywords.Definitions, pointer.split('/').pop()),
  );

  const updatedUiNodeMap = renameNodePointer(uiSchemaNodes, pointer, promotedNodePointer);

  // Need to add the pointer back to the parent node
  const parentNode = getParentNodeByPointer(updatedUiNodeMap, pointer);

  if (parentNode) {
    parentNode.children.push(pointer);
  } else {
    throw new Error(`Can't find the parent of ${pointer}`);
  }

  // Add the promoted node back to the bottom of the stack.
  updatedUiNodeMap.push(
    Object.assign(deepCopy(uiNode), {
      pointer: promotedNodePointer,
      children: updatedUiNodeMap[uiNodeIndex].children,
    }),
  );
  // Get the reference node in the same position as the previous node
  updatedUiNodeMap[uiNodeIndex] = Object.assign(createNodeBase(pointer), {
    objectKind: ObjectKind.Reference,
    ref: promotedNodePointer,
  });
  return updatedUiNodeMap;
};
