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
import { deepCopy } from 'app-shared/pure';
import { makePointerFromArray } from '../pointerUtils';
import { SchemaModel } from '../SchemaModel';

export const convertPropToType = (model: SchemaModel, pointer: string): SchemaModel => {
  const uiNodeIndex = getNodeIndexByPointer(model.asArray(), pointer);
  const uiNode = model.getNode(pointer);

  if (isReference(uiNode)) {
    throw new Error(`Pointer ${pointer} is already a reference.`);
  }

  const promotedNodePointer = getUniqueNodePath(
    model.asArray(),
    makePointerFromArray([Keyword.Definitions, pointer.split('/').pop()]),
  );

  const updatedUiSchemaNodes = renameNodePointer(model.asArray(), pointer, promotedNodePointer);

  // Need to add the pointer back to the parent node
  const parentNode = getParentNodeByPointer(updatedUiSchemaNodes, pointer);

  if (parentNode) {
    parentNode.children[parentNode.children.indexOf(promotedNodePointer)] = pointer;
  } else {
    throw new Error(`Can't find the parent of ${pointer}`);
  }
  if (parentNode.pointer === ROOT_POINTER && pointerIsDefinition(pointer)) {
    throw new Error(`Pointer ${pointer} is already a definition.`);
  }

  // Save the children of the original node.
  const originalNode = updatedUiSchemaNodes[uiNodeIndex];
  const children = isFieldOrCombination(originalNode) ? originalNode.children : undefined;

  // Get the reference node in the same position as the previous node
  updatedUiSchemaNodes[uiNodeIndex] = Object.assign(createNodeBase(pointer), {
    objectKind: ObjectKind.Reference,
    reference: promotedNodePointer,
    isRequired: uiNode.isRequired,
    isArray: uiNode.isArray,
  });
  // Add the promoted node back to the bottom of the stack.
  const finalNodes = insertSchemaNode(
    [...updatedUiSchemaNodes],
    Object.assign(deepCopy(uiNode), {
      pointer: promotedNodePointer,
      children,
      isRequired: false,
      isArray: false,
    }),
  );
  return SchemaModel.fromArray(finalNodes);
};
