import type { UiSchemaNodes } from '../types';
import { Keywords, ObjectKind } from '../types';
import { createNodeBase, getUniqueNodePath, makePointer, pointerIsDefinition } from '../utils';
import { getNodeIndexByPointer, getParentNodeByPointer } from '../selectors';
import { renameNodePointer } from './rename-node';
import { insertSchemaNode } from './create-node';
import { ROOT_POINTER } from '../constants';
import { deepCopy } from 'app-shared/pure';

export const convertPropToType = (uiSchemaNodes: UiSchemaNodes, pointer: string) => {
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
    makePointer(Keywords.Definitions, pointer.split('/').pop())
  );

  const updatedUiSchemaNodes = renameNodePointer(uiSchemaNodes, pointer, promotedNodePointer);

  // Need to add the pointer back to the parent node
  const parentNode = getParentNodeByPointer(updatedUiSchemaNodes, pointer);

  if (parentNode) {
    parentNode.children[parentNode.children.indexOf(promotedNodePointer)] = pointer;
  } else {
    throw new Error(`Can't find the parent of ${pointer}`);
  }
  if (parentNode.pointer === ROOT_POINTER && pointerIsDefinition(pointer)) {
    throw new Error(`Pointer ${pointer}, is already a definition.`);
  }

  // Save the children of the original node.
  const { children } = updatedUiSchemaNodes[uiNodeIndex];

  // Get the reference node in the same position as the previous node
  updatedUiSchemaNodes[uiNodeIndex] = Object.assign(createNodeBase(pointer), {
    objectKind: ObjectKind.Reference,
    ref: promotedNodePointer,
    isRequired: uiNode.isRequired,
  });
  // Add the promoted node back to the bottom of the stack.
  return insertSchemaNode(
    [...updatedUiSchemaNodes],
    Object.assign(deepCopy(uiNode), {
      pointer: promotedNodePointer,
      children,
      isRequired: false,
    })
  );
};
