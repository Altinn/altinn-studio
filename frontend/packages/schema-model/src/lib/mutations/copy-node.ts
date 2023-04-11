import { UiSchemaNodes } from '../types';
import { deepCopy } from 'app-shared/pure';
import { getParentNodeByPointer } from '../selectors';

export const copyNodePointer = (
  uiSchemaNodes: UiSchemaNodes,
  sourcePointer: string,
  targetPointer: string
) => {
  if (sourcePointer === targetPointer) {
    throw new Error('SourcePointer and TargetPointer is equal.');
  }

  const mutatedNodes: UiSchemaNodes = deepCopy(uiSchemaNodes);
  // First find all nodes that we need to copy
  // Then copy thoose nodes to the mutatedNodeArray
  uiSchemaNodes
    .filter(
      (node) => node.pointer.startsWith(`${sourcePointer}/`) || node.pointer === sourcePointer
    )
    .forEach((node) =>
      mutatedNodes.push(
        Object.assign(deepCopy(node), {
          pointer: node.pointer.replace(sourcePointer, targetPointer),
          children: node.children.map((child) => child.replace(sourcePointer, targetPointer)),
        })
      )
    );
  const parentNode = getParentNodeByPointer(mutatedNodes, sourcePointer);
  parentNode.children.push(targetPointer);
  return mutatedNodes;
};
