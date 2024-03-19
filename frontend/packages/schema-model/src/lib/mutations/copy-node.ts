import type { UiSchemaNodes } from '../../types';
import { deepCopy } from 'app-shared/pure';
import { getParentNodeByPointer } from '../selectors';
import { isFieldOrCombination } from '../utils';

export const copyNodePointer = (
  uiSchemaNodes: UiSchemaNodes,
  sourcePointer: string,
  targetPointer: string,
) => {
  if (sourcePointer === targetPointer) {
    throw new Error('SourcePointer and TargetPointer is equal.');
  }

  const mutatedNodes: UiSchemaNodes = deepCopy(uiSchemaNodes);
  // First find all nodes that we need to copy
  // Then copy thoose nodes to the mutatedNodeArray
  uiSchemaNodes
    .filter(
      (node) => node.pointer.startsWith(`${sourcePointer}/`) || node.pointer === sourcePointer,
    )
    .forEach((node) => {
      const newNode = deepCopy(node);
      newNode.pointer = node.pointer.replace(sourcePointer, targetPointer);
      if (isFieldOrCombination(newNode)) {
        newNode.children = newNode.children.map((child) =>
          child.replace(sourcePointer, targetPointer),
        );
      }
      mutatedNodes.push(newNode);
    });
  const parentNode = getParentNodeByPointer(mutatedNodes, sourcePointer);
  parentNode.children.push(targetPointer);
  return mutatedNodes;
};
