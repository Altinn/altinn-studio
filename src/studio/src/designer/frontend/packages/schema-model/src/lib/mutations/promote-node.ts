import { Keywords, ObjectKind, UiSchemaNodes } from '../types';
import { createNodeBase, deepCopy, getParentNodeByPointer, makePointer } from '../utils';
import { getNodeIndexByPointer, getUniqueNodePath } from '../selectors';
import { renameNodePointer } from './rename-node';
import { insertSchemaNode } from './create-node';

export const promotePropertyToType = (uiSchemaNodes: UiSchemaNodes, pointer: string) => {
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
    parentNode.children[parentNode.children.indexOf(promotedNodePointer)] = pointer;
  } else {
    throw new Error(`Can't find the parent of ${pointer}`);
  }

  // Get the reference node in the same position as the previous node
  updatedUiNodeMap[uiNodeIndex] = Object.assign(createNodeBase(pointer), {
    objectKind: ObjectKind.Reference,
    ref: promotedNodePointer,
    isRequired: uiNode.isRequired,
  });

  // Add the promoted node back to the bottom of the stack.
  return insertSchemaNode(
    updatedUiNodeMap,
    Object.assign(deepCopy(uiNode), {
      pointer: promotedNodePointer,
      children: updatedUiNodeMap[uiNodeIndex].children,
      isRequired: false,
    }),
  );
};
