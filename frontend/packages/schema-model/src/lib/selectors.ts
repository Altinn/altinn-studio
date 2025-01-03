import type { UiSchemaNode, UiSchemaNodes } from '../types';
import { isFieldOrCombination, isReference } from './utils';
import { ROOT_POINTER } from './constants';
import { SchemaModel } from './SchemaModel';
import type { CombinationNode } from '../types/CombinationNode';
import type { FieldNode } from '../types/FieldNode';

export const getRootNode = (uiSchemaNodes: UiSchemaNodes): FieldNode =>
  getNodeByPointer(uiSchemaNodes, ROOT_POINTER) as FieldNode;

/**
 * This little trick is what is making it possible to work with very large models. It's a needed complexity to beeing able
 * to handle very large models in an array. React and probably other SPA-frameworks will have problems dealing with the
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
    uiSchemaNodes.forEach((node) => nodePointers.cache.set(node.schemaPointer, node));
  }
  return nodePointers.cache;
};

export const hasNodePointer = (uiSchemaNodes: UiSchemaNodes, schemaPointer: string): boolean =>
  getNodePointerCache(uiSchemaNodes).has(schemaPointer);

export const getNodeByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  schemaPointer: string,
): UiSchemaNode | undefined => {
  try {
    return SchemaModel.fromArray(uiSchemaNodes).getNodeBySchemaPointer(schemaPointer);
  } catch {
    return undefined;
  }
};

/**
 * Returns the index or undefined.
 *
 * @param uiSchemaNodes
 * @param schemaPointer
 */
export const getNodeIndexByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  schemaPointer: string,
): number | undefined => {
  const index = uiSchemaNodes.findIndex((node) => node.schemaPointer === schemaPointer);
  return index > -1 ? index : undefined;
};

export const getChildNodesByFieldPointer = (
  uiSchemaNodes: UiSchemaNodes,
  schemaPointer: string,
): UiSchemaNode[] => {
  const node = getNodeByPointer(uiSchemaNodes, schemaPointer);
  if (!isFieldOrCombination(node)) return [];
  return node.children.map((childPointer) => getNodeByPointer(uiSchemaNodes, childPointer));
};

export const getParentNodeByPointer = (
  uiSchemaNodes: UiSchemaNodes,
  schemaPointer: string,
): CombinationNode | FieldNode | undefined => {
  const pointerParts = schemaPointer.split('/');
  while (pointerParts.length) {
    pointerParts.pop();
    const pointerCandidate = pointerParts.join('/');
    if (hasNodePointer(uiSchemaNodes, pointerCandidate)) {
      return getNodeByPointer(uiSchemaNodes, pointerCandidate) as CombinationNode | FieldNode;
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

export const getReferredNodes = (uiSchemaNodes: UiSchemaNodes, ref: string): UiSchemaNodes => {
  if (referredNodes.uiSchemaNodes !== uiSchemaNodes || referredNodes.cache.size === 0) {
    referredNodes.uiSchemaNodes = uiSchemaNodes;
    referredNodes.cache = new Map();
    uiSchemaNodes
      .filter(isReference)
      .forEach((node) =>
        referredNodes.cache.set(node.reference ?? '_', [
          ...(referredNodes.cache.get(ref) ?? []),
          node,
        ]),
      );
  }
  return referredNodes.cache.get(ref) ?? [];
};
