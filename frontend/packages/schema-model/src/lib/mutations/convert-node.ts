import type { UiSchemaNodes } from '../../types';
import { Keyword, ObjectKind } from '../../types';
import { createNodeBase, getUniqueNodePath, makePointer, pointerIsDefinition } from '../utils';
import {
  getNodeByPointer,
  getNodeIndexByPointer,
  getParentNodeByPointer,
  getReferredNodes,
} from '../selectors';
import { renameNodePointer } from './rename-node';
import { insertSchemaNode } from './create-node';
import { ROOT_POINTER } from '../constants';
import { deepCopy } from 'app-shared/pure';
import { removeNodeByPointer } from './remove-node';
import { copyNodePointer } from './copy-node';

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
    makePointer(Keyword.Definitions, pointer.split('/').pop())
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
    reference: promotedNodePointer,
    isRequired: uiNode.isRequired,
    isArray: uiNode.isArray,
  });
  // Add the promoted node back to the bottom of the stack.
  return insertSchemaNode(
    [...updatedUiSchemaNodes],
    Object.assign(deepCopy(uiNode), {
      pointer: promotedNodePointer,
      children,
      isRequired: false,
      isArray: false,
    })
  );
};

export const convertRefToField = (uiSchemaNodes: UiSchemaNodes, pointer: string) => {
  const uiNodeIndex = getNodeIndexByPointer(uiSchemaNodes, pointer);
  if (uiNodeIndex === undefined) {
    throw new Error(`Pointer ${pointer}, can't be found.`);
  }
  const uiNode = uiSchemaNodes[uiNodeIndex];
  if (uiNode.objectKind !== ObjectKind.Reference) {
    throw new Error(`Pointer ${pointer} is not a reference.`);
  }
  const { reference, isRequired } = uiNode;
  const otherReferredNodes = getReferredNodes(uiSchemaNodes, reference);

  let updatedUiSchemaNodes = removeNodeByPointer(uiSchemaNodes, pointer);
  // If there is no other referred nodes, just rename the reference to the pointer
  // else perform a copy.
  updatedUiSchemaNodes =
    otherReferredNodes.length === 1
      ? renameNodePointer(updatedUiSchemaNodes, reference, pointer)
      : copyNodePointer(updatedUiSchemaNodes, reference, pointer);
  const newNode = getNodeByPointer(updatedUiSchemaNodes, pointer);
  newNode.reference = undefined;
  newNode.isRequired = isRequired;

  return updatedUiSchemaNodes;
};
