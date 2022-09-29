import type { UiSchemaNode, UiSchemaNodes } from './types';
import { FieldType, Keywords, ROOT_POINTER } from './types';
import { makePointer } from './utils';

export const getRootNodes = (uiSchemaMap: UiSchemaNodes, defs: boolean): UiSchemaNode[] => {
  const parentNodeIndex = getNodeIndexByPointer(uiSchemaMap, ROOT_POINTER);
  if (parentNodeIndex !== undefined) {
    const childPointers = uiSchemaMap[parentNodeIndex].children.filter(
      (p) => p.startsWith(makePointer(Keywords.Definitions)) === defs,
    );
    return uiSchemaMap.filter((uiSchemaNode) => childPointers.includes(uiSchemaNode.pointer));
  } else {
    return [];
  }
};

export const pointerExists = (uiSchemaNodes: UiSchemaNodes, pointer: string): boolean =>
  getNodeIndexByPointer(uiSchemaNodes, pointer) !== undefined;

export const getNodeDisplayName = (uiSchemaNode: UiSchemaNode) => uiSchemaNode.pointer.split('/').pop() ?? '';

export const getUniqueNodePath = (uiNodeMap: UiSchemaNodes, targetPointer: string): string => {
  let newPointer = targetPointer;
  let postfix = 0;
  while (pointerExists(uiNodeMap, newPointer)) {
    newPointer = targetPointer + postfix;
    postfix++;
  }
  return newPointer;
};

/**
 * Return the node or throw an error. If you need to do a check of existance use getNodeIndexByPointer and
 * just access the item directly to avoid duplicate scans.
 *
 * @param uiSchemaNodes
 * @param pointer
 */
export const getNodeByPointer = (uiSchemaNodes: UiSchemaNodes, pointer: string): UiSchemaNode => {
  const uiSchemaNode = uiSchemaNodes.find((node) => node.pointer === pointer);
  if (uiSchemaNode) {
    return uiSchemaNode;
  } else {
    throw new Error("Can't find node with pointer " + pointer);
  }
};

/**
 * Returns the index or undefined.
 *
 * @param uiSchemaNodes
 * @param pointer
 */
export const getNodeIndexByPointer = (uiSchemaNodes: UiSchemaNodes, pointer: string): number | undefined => {
  const index = uiSchemaNodes.findIndex((node) => node.pointer === pointer);
  return index > -1 ? index : undefined;
};

export const getChildNodesByPointer = (uiNodeMap: UiSchemaNodes, pointer: string): UiSchemaNode[] =>
  getChildNodesByNode(uiNodeMap, getNodeByPointer(uiNodeMap, pointer));

export const getChildNodesByNode = (uiNodeMap: UiSchemaNodes, parentNode: UiSchemaNode): UiSchemaNode[] =>
  uiNodeMap.filter((node) => parentNode.children.includes(node.pointer));

export const combinationIsNullable = (childNodes: UiSchemaNode[]): boolean => {
  const childrenWithNullType = childNodes.filter((child) => child.fieldType === FieldType.Null);
  return childrenWithNullType.length > 0;
};
