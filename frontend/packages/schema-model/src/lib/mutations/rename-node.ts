import type { UiSchemaNodes } from '../../types';
import { CombinationKind } from '../../types';
import { getNodeByPointer, hasNodePointer } from '../selectors';
import { isFieldOrCombination, isReference, splitPointerInBaseAndName } from '../utils';
import { ObjectUtils } from '@studio/pure-functions';

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
    const nodeCopy = ObjectUtils.deepCopy(uiNode);
    if (pointerIsInBranch(uiNode.schemaPointer, oldPointer)) {
      nodeCopy.schemaPointer = nodeCopy.schemaPointer.replace(oldPointer, newPointer);
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

const pointerIsInBranch = (schemaPointer: string, pointer2: string) =>
  schemaPointer === pointer2 || schemaPointer.startsWith(`${pointer2}/`);
