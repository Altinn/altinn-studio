import type { UiSchemaNode, UiSchemaNodes } from '../types';
import { Keyword } from '../types';
import { makePointer } from './utils';
import { ROOT_POINTER } from './constants';

export const getRootNodes = (uiSchemaNodes: UiSchemaNodes, defs: boolean): UiSchemaNodes => {
  const rootNodes: UiSchemaNodes = [];
  if (hasNodePointer(uiSchemaNodes, ROOT_POINTER)) {
    getRootNode(uiSchemaNodes)
      .children.filter((p) => p.startsWith(makePointer(Keyword.Definitions)) === defs)
      .forEach((childPointer) => rootNodes.push(getNodeByPointer(uiSchemaNodes, childPointer)));
  }
  return rootNodes;
};

export const getRootNode = (uiSchemaNodes: UiSchemaNodes): UiSchemaNode =>
  getNodeByPointer(uiSchemaNodes, ROOT_POINTER);

/**
 * This litt trick is what making it possible to work with very large models. Its a needed complexity to beeing able
 * to handle very large models in an array. React and proably other SPA-frameworks will have problem dealing with the
 * Map datastructure directly, so that is why wee keep these pointers in an internal cache that we can access when
 * doing mutations.
 */
const nodePointers: { uiSchemaNodes: UiSchemaNodes; cache: Map<string, UiSchemaNode> } = {
  uiSchemaNodes: [],
  cache: new Map<string, UiSchemaNode>(),
};

const getNodePointerCache = (uiSchemaNodes: UiSchemaNodes): Map<string, UiSchemaNode> => {
  if (
    nodePointers.uiSchemaNodes !== uiSchemaNodes ||
    nodePointers.cache.size !== uiSchemaNodes.length
  ) {
    nodePointers.uiSchemaNodes = uiSchemaNodes;
    nodePointers.cache = new Map();
    uiSchemaNodes.forEach((node) => nodePointers.cache.set(node.pointer, node));
  }
  return nodePointers.cache;
};

export const hasNodePointer = (uiSchemaNodes: UiSchemaNodes, pointer: string): boolean =>
  getNodePointerCache(uiSchemaNodes).has(pointer);

export const getNodeByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  pointer: string
): UiSchemaNode | undefined => getNodePointerCache(uiSchemaNodes).get(pointer);

/**
 * Returns the index or undefined.
 *
 * @param uiSchemaNodes
 * @param pointer
 */
export const getNodeIndexByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  pointer: string
): number | undefined => {
  const index = uiSchemaNodes.findIndex((node) => node.pointer === pointer);
  return index > -1 ? index : undefined;
};

export const getChildNodesByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  pointer: string
): UiSchemaNode[] => {
  const parentNode = getNodeByPointer(uiSchemaNodes, pointer);
  if (!parentNode) return [];

  return parentNode.children.map((childPointer) => getNodeByPointer(uiSchemaNodes, childPointer));
};

export const getParentNodeByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  pointer: string
): UiSchemaNode | undefined => {
  const pointerParts = pointer.split('/');
  while (pointerParts.length) {
    pointerParts.pop();
    const pointerCandidate = pointerParts.join('/');
    if (hasNodePointer(uiSchemaNodes, pointerCandidate)) {
      return getNodeByPointer(uiSchemaNodes, pointerCandidate);
    }
  }
  return undefined;
};

/**
 * Solving the same problem as described above.
 */
const referredNodes: { uiSchemaNodes: UiSchemaNodes; cache: Map<string, UiSchemaNodes> } = {
  uiSchemaNodes: [],
  cache: new Map(),
};

export const getReferredNodes = (uiSchemaNodes: UiSchemaNodes, ref: string) => {
  if (referredNodes.uiSchemaNodes !== uiSchemaNodes || referredNodes.cache.size === 0) {
    referredNodes.uiSchemaNodes = uiSchemaNodes;
    referredNodes.cache = new Map();
    uiSchemaNodes
      .filter((node) => typeof node.reference === 'string')
      .forEach((node) =>
        referredNodes.cache.set(node.reference ?? '_', [
          ...(referredNodes.cache.get(ref) ?? []),
          node,
        ])
      );
  }
  return referredNodes.cache.get(ref) ?? [];
};
