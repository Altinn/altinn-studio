import type { UiSchemaNode, UiSchemaNodes } from '../../types';
import { Keyword } from '../../types';
import { createNodeBase, isCombination, isField, isObject, isReference } from '../utils';
import { getParentNodeByPointer, hasNodePointer } from '../selectors';
import { ObjectUtils } from '@studio/pure-functions';

export const insertSchemaNode = (
  uiSchemaNodes: UiSchemaNodes,
  newNode: UiSchemaNode,
): UiSchemaNodes => {
  if (hasNodePointer(uiSchemaNodes, newNode.schemaPointer)) {
    throw new Error(`Pointer ${newNode.schemaPointer} exists already`);
  }

  const mutatedNodeArray: UiSchemaNodes = ObjectUtils.deepCopy(uiSchemaNodes);
  const parentNode = getParentNodeByPointer(mutatedNodeArray, newNode.schemaPointer);
  if (!parentNode) {
    throw new Error(`Can't find ParentNode for pointer ${newNode.schemaPointer}`);
  }
  parentNode.children.push(newNode.schemaPointer);
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
  const { schemaPointer, isArray } = parentNode;
  if (isArray) {
    throw new Error("This application doesn't support combined array types.");
  } else if (isReference(parentNode)) {
    throw new Error("Can't create a new node under a reference.");
  } else if (isCombination(parentNode)) {
    return Object.assign(
      createNodeBase(
        schemaPointer,
        parentNode.combinationType,
        parentNode.children.length.toString(),
      ),
      {
        isCombinationItem: true,
      },
    );
  } else if (isField(parentNode) && isObject(parentNode) && isDefinition) {
    return createNodeBase(schemaPointer, Keyword.Definitions, displayName);
  } else if (isField(parentNode) && isObject(parentNode) && !isDefinition) {
    return createNodeBase(schemaPointer, Keyword.Properties, displayName);
  } else if (isField(parentNode)) {
    throw new Error(`Can't add node to fieldtype ${parentNode.fieldType}`);
  } else {
    throw new Error('invalid parent node');
  }
};
