import type { UiSchemaNode, UiSchemaNodes } from '../../types';
import { ROOT_POINTER } from '../constants';
import { isFieldOrCombination } from '../utils';

export const sortNodesByChildren = (uiSchemaNodes: UiSchemaNodes): UiSchemaNodes => {
  const tempMap = new Map();
  uiSchemaNodes.forEach((node) => tempMap.set(node.schemaPointer, node));
  return treeWalker(tempMap, ROOT_POINTER);
};

const treeWalker = (map: Map<string, UiSchemaNode>, schemaPointer: string): UiSchemaNodes => {
  const nodes = [];
  if (map.has(schemaPointer)) {
    const currentNode = map.get(schemaPointer) as UiSchemaNode;
    nodes.push(currentNode);
    if (isFieldOrCombination(currentNode)) {
      currentNode.children.forEach((childPointer) => nodes.push(...treeWalker(map, childPointer)));
    }
  } else {
    throw new Error(`Can't find ${schemaPointer} in node-array.`);
  }
  return nodes;
};
