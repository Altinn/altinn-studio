// Changes to the uiNodeMap
import { ObjectKind, UiSchemaNode, UiSchemaNodes } from '../types';
import { getParentNodeByPointer, getReferredNodes, hasNodePointer } from '../selectors';
import { splitPointerInBaseAndName } from '../utils';

export const removeNodeByPointer = (uiNodeMap: UiSchemaNodes, pointer: string, justChildren?: boolean) => {
  let mutatedUiNodeMap: UiSchemaNodes = [...uiNodeMap];

  // Remove the child node pointer from the parent
  if (!hasNodePointer(mutatedUiNodeMap, pointer)) {
    throw new Error(`Can't remove ${pointer}, doesn't exist`);
  }

  // Won't remove containers that have references
  if (getReferredNodes(mutatedUiNodeMap, pointer).length > 0) {
    throw new Error(`Won't remove ${pointer}, it has referred nodes.`);
  }

  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, pointer);
  if (parentNode) {
    parentNode.children = parentNode.children.filter((childPointer) => pointer !== childPointer);
  } else {
    throw new Error(`Can't remove ${pointer}, can't find parent node.`);
  }

  // Remove itself decendants... just using the pointer
  mutatedUiNodeMap = mutatedUiNodeMap.filter(
    (uiNode: UiSchemaNode) => !uiNode.pointer.startsWith(justChildren ? pointer + '/' : pointer),
  );

  // dealing with combinations, updating their children is a little more tricky.
  if (parentNode.objectKind === ObjectKind.Combination) {
    parentNode.children.forEach((oldPointerBase, index) => {
      const { base, name } = splitPointerInBaseAndName(oldPointerBase);
      const newPointerBase = [base, index].join('/');
      if (oldPointerBase !== newPointerBase && !isNaN(Number(name))) {
        mutatedUiNodeMap.forEach((uiNode) => {
          uiNode.pointer = uiNode.pointer.replace(oldPointerBase, newPointerBase);
          uiNode.children = uiNode.children.map((p) => p.replace(oldPointerBase, newPointerBase));
        });
      }
    });
  }
  return mutatedUiNodeMap;
};
