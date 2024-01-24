import type { UiSchemaNode, UiSchemaNodes } from '../../types';
import { Keyword } from '../../types';
import { createNodeBase, isCombination, isField, isObject, isReference } from '../utils';
import { getParentNodeByPointer, hasNodePointer } from '../selectors';
import { deepCopy } from 'app-shared/pure';

export const insertSchemaNode = (
  uiSchemaNodes: UiSchemaNodes,
  newNode: UiSchemaNode,
): UiSchemaNodes => {
  if (hasNodePointer(uiSchemaNodes, newNode.pointer)) {
    throw new Error(`Pointer ${newNode.pointer} exists already`);
  }

  const mutatedNodeArray: UiSchemaNodes = deepCopy(uiSchemaNodes);
  const parentNode = getParentNodeByPointer(mutatedNodeArray, newNode.pointer);
  if (!parentNode) {
    throw new Error(`Can't find ParentNode for pointer ${newNode.pointer}`);
  }
  parentNode.children.push(newNode.pointer);
  mutatedNodeArray.push(newNode);
  return mutatedNodeArray;
};

/**
 * Creates a new
 *
 * @param parentNode
 * @param displayName
 * @param isDefinition
 */
export const createChildNode = (
  parentNode: UiSchemaNode,
  displayName: string,
  isDefinition: boolean,
): UiSchemaNode => {
  const { pointer, isArray } = parentNode;
  if (isArray) {
    throw new Error("This application doesn't support combined array types.");
  } else if (isReference(parentNode)) {
    throw new Error("Can't create a new node under a reference.");
  } else if (isCombination(parentNode)) {
    return Object.assign(
      createNodeBase(pointer, parentNode.combinationType, parentNode.children.length.toString()),
      {
        isCombinationItem: true,
      },
    );
  } else if (isField(parentNode) && isObject(parentNode) && isDefinition) {
    return createNodeBase(pointer, Keyword.Definitions, displayName);
  } else if (isField(parentNode) && isObject(parentNode) && !isDefinition) {
    return createNodeBase(pointer, Keyword.Properties, displayName);
  } else if (isField(parentNode)) {
    throw new Error(`Can't add node to fieldtype ${parentNode.fieldType}`);
  } else {
    throw new Error('invalid parent node');
  }
};
