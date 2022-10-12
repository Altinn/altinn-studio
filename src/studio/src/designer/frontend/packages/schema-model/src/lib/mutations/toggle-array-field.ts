import { FieldType, Keywords, ObjectKind, UiSchemaNode, UiSchemaNodes } from '../types';
import { getChildNodesByNode, getNodeByPointer, getNodeIndexByPointer, getParentNodeByPointer } from '../selectors';
import { makePointer, pointerReplacer } from '../utils';
import { removeNodeByPointer } from './remove-node';
import { deepCopy } from 'app-shared/pure';

export const canToggleArrayAndField = (uiSchemaNodes: UiSchemaNodes, pointer: string): boolean => {
  const uiSchemaNode = getNodeByPointer(uiSchemaNodes, pointer);
  if (uiSchemaNode.isCombinationItem) {
    return false; // we are not dealing with items that are part of a combination.
  }
  if (uiSchemaNode.objectKind === ObjectKind.Array) {
    if (Object.keys(uiSchemaNode.restrictions).length) {
      return false; // We don't want to have array restrictions at the child
    }
    const childNodes = getChildNodesByNode(uiSchemaNodes, uiSchemaNode);
    if (childNodes.length === 0) {
      return true; // Easy to flip back, no items.
    }
    return !(Object.keys(childNodes[0].custom).length && Object.keys(uiSchemaNode).length);
  } else {
    return true; // a field object combination or what ever can always be flipped.
  }
};

export const toggleArrayAndField = (uiSchemaNodes: UiSchemaNodes, pointer: string) => {
  if (!canToggleArrayAndField(uiSchemaNodes, pointer)) {
    throw new Error(`Can't toggle ${pointer} between array and field.`);
  }
  const nodeIndex = getNodeIndexByPointer(uiSchemaNodes, pointer);
  if (!nodeIndex) {
    throw new Error(`Can't toggle ${pointer} between array and field, can't find pointer.`);
  }
  const uiSchemaNode = uiSchemaNodes[nodeIndex];

  const itemsPointer = makePointer(pointer, Keywords.Items);
  if (uiSchemaNode.objectKind === ObjectKind.Array) {
    // First remove the items pointer and all its children
    const mutatedNodeArray = removeNodeByPointer(uiSchemaNodes, itemsPointer);
    // Replace the Array with
    mutatedNodeArray[nodeIndex] = pointerReplacer(getNodeByPointer(uiSchemaNodes, itemsPointer), itemsPointer, pointer);
    uiSchemaNodes.forEach((node) => {
      if (node.pointer.startsWith(itemsPointer) && node.pointer !== itemsPointer) {
        mutatedNodeArray.push(pointerReplacer(node, itemsPointer, pointer));
      }
    });
    return mutatedNodeArray;
  } else {
    const arrayNode: UiSchemaNode = deepCopy(uiSchemaNode);
    const itemsNode: UiSchemaNode = pointerReplacer(uiSchemaNode, pointer, itemsPointer);
    arrayNode.objectKind = ObjectKind.Array;
    arrayNode.fieldType = FieldType.Array;
    arrayNode.implicitType = false;
    arrayNode.isNillable = false;
    arrayNode.children = [itemsPointer];
    arrayNode.custom = {};
    arrayNode.enum = undefined;
    arrayNode.restrictions = {};
    arrayNode.ref = undefined;
    itemsNode.title = undefined;
    itemsNode.description = undefined;
    itemsNode.isRequired = false;

    const mutatedNodeArray = removeNodeByPointer(uiSchemaNodes, pointer, true);
    const parentNode = getParentNodeByPointer(mutatedNodeArray, pointer);
    if (parentNode) {
      parentNode.children.push(pointer);
    }
    mutatedNodeArray[nodeIndex] = arrayNode;
    mutatedNodeArray.push(itemsNode);
    // updating children of the items node
    uiSchemaNodes.forEach((node) => {
      if (node.pointer.startsWith(pointer + '/')) {
        mutatedNodeArray.push(pointerReplacer(node, pointer, itemsPointer));
      }
    });

    return mutatedNodeArray;
  }
};
