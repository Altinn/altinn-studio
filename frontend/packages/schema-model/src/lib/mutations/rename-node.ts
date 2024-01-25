import type { UiSchemaNodes } from '../../types';
import { CombinationKind } from '../../types';
import { getNodeByPointer, hasNodePointer } from '../selectors';
import { isFieldOrCombination, isReference, splitPointerInBaseAndName } from '../utils';
import { deepCopy } from 'app-shared/pure';

export const renameNodePointer = (
  uiSchemaNodes: UiSchemaNodes,
  oldPointer: string,
  newPointer: string,
) => {
  if (oldPointer === newPointer) {
    throw new Error('Old and new name are equal');
  }

  if (!hasNodePointer(uiSchemaNodes, oldPointer)) {
    const { base, name } = splitPointerInBaseAndName(oldPointer);
    if (
      Object.values(CombinationKind).includes(name as CombinationKind) &&
      getNodeByPointer(uiSchemaNodes, base)
    ) {
      // Its a valid combo-item... just continue.
    } else {
      throw new Error(`Can't rename pointer ${oldPointer}, it doesn't exist`);
    }
  }
  const mutatedNodeArray: UiSchemaNodes = [];
  uiSchemaNodes.forEach((uiNode) => {
    const nodeCopy = deepCopy(uiNode);
    if (pointerIsInBranch(uiNode.pointer, oldPointer)) {
      nodeCopy.pointer = nodeCopy.pointer.replace(oldPointer, newPointer);
    }
    if (isReference(nodeCopy) && nodeCopy.reference === oldPointer) {
      nodeCopy.reference = nodeCopy.reference.replace(oldPointer, newPointer);
    }
    if (isFieldOrCombination(nodeCopy) && isFieldOrCombination(uiNode)) {
      nodeCopy.children =
        uiNode.children?.map((childPointer) =>
          pointerIsInBranch(childPointer, oldPointer)
            ? childPointer.replace(oldPointer, newPointer)
            : childPointer,
        ) ?? [];
    }
    mutatedNodeArray.push(nodeCopy);
  });
  return mutatedNodeArray;
};

const pointerIsInBranch = (pointer: string, pointer2: string) =>
  pointer === pointer2 || pointer.startsWith(`${pointer2}/`);
