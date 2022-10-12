import type { UiSchemaNode, UiSchemaNodes } from './types';
import { Keywords } from './types';
import { makePointer } from './utils';
import { ROOT_POINTER } from './constants';

export const getRootNodes = (uiSchemaNodes: UiSchemaNodes, defs: boolean): UiSchemaNode[] => {
  const parentNodeIndex = getNodeIndexByPointer(uiSchemaNodes, ROOT_POINTER);
  if (parentNodeIndex !== undefined) {
    const childPointers = uiSchemaNodes[parentNodeIndex].children.filter(
      (p) => p.startsWith(makePointer(Keywords.Definitions)) === defs,
    );
    return uiSchemaNodes.filter((uiSchemaNode) => childPointers.includes(uiSchemaNode.pointer));
  } else {
    return [];
  }
};
export const getRootNode = (uiSchemaNodes: UiSchemaNodes): UiSchemaNode => {
  const rootNode = uiSchemaNodes.find((node) => node.pointer === ROOT_POINTER);
  if (rootNode) {
    return rootNode;
  } else {
    throw new Error('Cant find root node');
  }
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

export const getChildNodesByPointer = (uiSchemaNodes: UiSchemaNodes, pointer: string): UiSchemaNode[] =>
  getChildNodesByNode(uiSchemaNodes, getNodeByPointer(uiSchemaNodes, pointer));

export const getChildNodesByNode = (uiSchemaNodes: UiSchemaNodes, parentNode: UiSchemaNode): UiSchemaNode[] =>
  uiSchemaNodes.filter((node) => parentNode.children.includes(node.pointer));

export const getParentNodeByPointer = (uiSchemaNodes: UiSchemaNodes, pointer: string): UiSchemaNode | undefined => {
  const pointerParts = pointer.split('/');
  while (pointerParts.length) {
    pointerParts.pop();
    const parentNodeIndex = getNodeIndexByPointer(uiSchemaNodes, pointerParts.join('/'));
    if (parentNodeIndex !== undefined) {
      return uiSchemaNodes[parentNodeIndex];
    }
  }
  return undefined;
};
