import { CombinationKind, UiSchemaNodes } from '../types';
import { getNodeByPointer, pointerExists } from '../selectors';
import { splitPointerInBaseAndName } from '../utils';

export const renameNodePointer = (uiSchemaNodes: UiSchemaNodes, oldPointer: string, newPointer: string) => {
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
