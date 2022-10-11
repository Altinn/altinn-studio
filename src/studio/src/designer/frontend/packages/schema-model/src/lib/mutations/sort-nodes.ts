import { UiSchemaNode, UiSchemaNodes } from '../types';
import { ROOT_POINTER } from '../constants';

export const sortNodesByChildren = (uiSchemaNodes: UiSchemaNodes): UiSchemaNodes => {
  const tempMap = new Map();
  uiSchemaNodes.forEach((node) => tempMap.set(node.pointer, node));
  return treeWalker(tempMap, ROOT_POINTER);
};

const treeWalker = (map: Map<string, UiSchemaNode>, pointer: string): UiSchemaNodes => {
  const nodes = [];
  if (map.has(pointer)) {
    const currentNode = map.get(pointer) as UiSchemaNode;
    nodes.push(currentNode);
    currentNode.children.forEach((childPointer) => nodes.push(...treeWalker(map, childPointer)));
  } else {
    throw new Error(`Can't find ${pointer} in node-array.`);
  }
  return nodes;
};
