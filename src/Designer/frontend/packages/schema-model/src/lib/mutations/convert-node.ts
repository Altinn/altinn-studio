import { Keyword, ObjectKind } from '../../types';
import {
  createNodeBase,
  getUniqueNodePath,
  isFieldOrCombination,
  isReference,
  pointerIsDefinition,
} from '../utils';
import { getNodeIndexByPointer, getParentNodeByPointer } from '../selectors';
import { renameNodePointer } from './rename-node';
import { insertSchemaNode } from './create-node';
import { ROOT_POINTER } from '../constants';
import { ObjectUtils } from '@studio/pure-functions';
import { makePointerFromArray } from '../pointerUtils';
import { SchemaModel } from '../SchemaModel';

export const convertPropToType = (model: SchemaModel, schemaPointer: string): SchemaModel => {
  const uiNodeIndex = getNodeIndexByPointer(model.asArray(), schemaPointer);
  const uiNode = model.getNodeBySchemaPointer(schemaPointer);

  if (isReference(uiNode)) {
    throw new Error(`Pointer ${schemaPointer} is already a reference.`);
  }

  const promotedNodePointer = getUniqueNodePath(
    model.asArray(),
    makePointerFromArray([Keyword.Definitions, schemaPointer.split('/').pop()]),
  );

  const updatedUiSchemaNodes = renameNodePointer(
    model.asArray(),
    schemaPointer,
    promotedNodePointer,
  );

  // Need to add the pointer back to the parent node
  const parentNode = getParentNodeByPointer(updatedUiSchemaNodes, schemaPointer);

  if (parentNode) {
    parentNode.children[parentNode.children.indexOf(promotedNodePointer)] = schemaPointer;
  } else {
    throw new Error(`Can't find the parent of ${schemaPointer}`);
  }
  if (parentNode.schemaPointer === ROOT_POINTER && pointerIsDefinition(schemaPointer)) {
    throw new Error(`Pointer ${schemaPointer} is already a definition.`);
  }

  // Save the children of the original node.
  const originalNode = updatedUiSchemaNodes[uiNodeIndex];
  const children = isFieldOrCombination(originalNode) ? originalNode.children : undefined;

  // Get the reference node in the same position as the previous node
  updatedUiSchemaNodes[uiNodeIndex] = Object.assign(createNodeBase(schemaPointer), {
    objectKind: ObjectKind.Reference,
    reference: promotedNodePointer,
    isRequired: uiNode.isRequired,
    isArray: uiNode.isArray,
  });
  // Add the promoted node back to the bottom of the stack.
  const finalNodes = insertSchemaNode(
    [...updatedUiSchemaNodes],
    Object.assign(ObjectUtils.deepCopy(uiNode), {
      schemaPointer: promotedNodePointer,
      children,
      isRequired: false,
      isArray: false,
    }),
  );
  return SchemaModel.fromArray(finalNodes);
};
