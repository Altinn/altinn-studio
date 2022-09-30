import { Keywords, ObjectKind, UiSchemaNodes } from '../types';
import { createNodeBase, makePointer, pointerIsDefinition } from '../utils';
import { getNodeByPointer, getUniqueNodePath } from '../selectors';
import { renameNodePointer } from './rename-node';

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
  const updatedUiNodeMap = renameNodePointer(uiSchemaNodes, pointer, newPointer);
  const simpleRefNode = createNodeBase(pointer);
  simpleRefNode.objectKind = ObjectKind.Reference;
  simpleRefNode.ref = newPointer;
  updatedUiNodeMap.push(simpleRefNode);
  return updatedUiNodeMap;
};
