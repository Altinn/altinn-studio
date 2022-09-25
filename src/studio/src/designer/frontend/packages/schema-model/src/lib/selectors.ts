import { FieldType, Keywords, ROOT_POINTER, UiSchemaMap, UiSchemaNode } from './types';

export const getRootNodes = (uiSchemaMap: UiSchemaMap, defs: boolean): UiSchemaNode[] => {
  const childNodes: UiSchemaNode[] = [];
  if (uiSchemaMap.has(ROOT_POINTER)) {
    uiSchemaMap.get(ROOT_POINTER).children.forEach((pointer) => {
      if (pointer.startsWith([ROOT_POINTER, Keywords.Definitions].join('/')) === defs) {
        childNodes.push(uiSchemaMap.get(pointer));
      }
    });
  }
  return childNodes;
};

export const isPointerInUse = (uiNodeMap: UiSchemaMap, pointer: string): boolean =>
  !!uiNodeMap.has(pointer);

export const getNodeDisplayName = (node: UiSchemaNode) => {
  const pointer = node.ref ?? node.pointer;
  return pointer.split('/').pop() ?? '';
};

export const getUniqueNodePath = (uiNodeMap: UiSchemaMap, targetPointer: string): string => {
  let newPointer = targetPointer;
  let postfix = 1;
  while (uiNodeMap.has(newPointer)) {
    newPointer = targetPointer + postfix;
    postfix++;
  }
  return newPointer;
};

export const getNodeByPointer = (uiNodeMap: UiSchemaMap, pointer: string): UiSchemaNode => {
  if (uiNodeMap.has(pointer)) {
    return uiNodeMap.get(pointer);
  } else {
    throw new Error("Can't find node with pointer " + pointer);
  }
};

export const getChildNodesByPointer = (uiNodeMap: UiSchemaMap, pointer: string): UiSchemaNode[] => {
  const parentNode = getNodeByPointer(uiNodeMap, pointer);
  return parentNode.children.map((childPointer) => getNodeByPointer(uiNodeMap, childPointer));
};

export const combinationIsNullable = (childNodes: UiSchemaNode[]): boolean => {
  const childrenWithNullType = childNodes.filter((child) => child.fieldType === FieldType.Null);
  return childrenWithNullType.length > 0;
};
