// Changes to the uiNodeMap
import { ObjectKind, UiSchemaNode, UiSchemaNodes } from '../types';
import { getNodeIndexByPointer } from '../selectors';
import { getParentNodeByPointer, splitPointerInBaseAndName } from '../utils';

export const removeNodeByPointer = (uiNodeMap: UiSchemaNodes, pointer: string, justChildren?: boolean) => {
  let mutatedUiNodeMap: UiSchemaNodes = [...uiNodeMap];
  // Remove the child node pointer from the parent
  const uiSchemaNode = getNodeIndexByPointer(mutatedUiNodeMap, pointer);
  if (!uiSchemaNode) {
    throw new Error(`Can't remove ${pointer}, doesn't exist`);
  }
  const parentNode = getParentNodeByPointer(mutatedUiNodeMap, pointer);
  if (parentNode) {
    parentNode.children = parentNode.children.filter((childPointer) => pointer !== childPointer);
  } else {
    throw new Error(`Can't find ParentNode for pointer ${pointer}`);
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
