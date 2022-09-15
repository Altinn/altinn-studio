import { JsonSchemaNode, Keywords, UiSchemaNode } from './types';
import { handleCustomProperties } from './handlers/custom-properties';
import { handleRestrictions } from './handlers/restrictions';
import { ObjectKind } from '../types/enums';
import { createNodeBase, getCombinationKind, getObjectKind, schemaTypeIsNillable } from './utils';
import { getUiFieldType } from './handlers/field-type';
import { handleGenericKeywords } from './handlers/generic';

/**
 * Recursive function that traverse the json schema tree. This should not be accessed directly but through `toUiSchema`
 *
 * @param schemaNode
 * @param uiNode
 */
export const createUiNode = (
  schemaNode: JsonSchemaNode,
  uiNode: UiSchemaNode,
): Map<string, UiSchemaNode> => {
  uiNode.objectKind = getObjectKind(schemaNode);
  uiNode.custom = handleCustomProperties(schemaNode);
  uiNode.restrictions = handleRestrictions(schemaNode);
  uiNode.fieldType = getUiFieldType(schemaNode);
  uiNode.implicitType = !schemaNode.type;
  uiNode.ref = schemaNode[Keywords.Reference];
  uiNode.isNillable = schemaTypeIsNillable(schemaNode.type);

  Object.assign(uiNode, handleGenericKeywords(schemaNode));

  const map = new Map<string, UiSchemaNode>();

  // Combinations
  if (uiNode.objectKind === ObjectKind.Combination) {
    const kind = getCombinationKind(schemaNode);
    schemaNode[kind].forEach((childNode: JsonSchemaNode, index: number) => {
      const child = createNodeBase(uiNode.pointer, kind, index.toString());
      uiNode.children.push(child.nodeId);
      createUiNode(childNode, child).forEach((i, k) => map.set(k, i));
    });
  }

  // Arrays
  if (uiNode.objectKind === ObjectKind.Array && schemaNode[Keywords.Items]) {
    const child = createNodeBase(uiNode.pointer, Keywords.Items);
    uiNode.children.push(child.nodeId);
    createUiNode(schemaNode[Keywords.Items], child).forEach((i, k) => map.set(k, i));
  }

  // Definitions
  Object.keys(schemaNode[Keywords.Definitions] ?? {}).forEach((key) => {
    const child = createNodeBase(uiNode.pointer, Keywords.Definitions, key);
    uiNode.children.push(child.nodeId);
    createUiNode(schemaNode[Keywords.Definitions][key], child).forEach((v, k) => map.set(k, v));
  });

  // Properties
  Object.keys(schemaNode[Keywords.Properties] ?? {}).forEach((key) => {
    const child = createNodeBase(uiNode.pointer, Keywords.Properties, key);
    child.isRequired = !!schemaNode.required?.includes(key);
    uiNode.children.push(child.nodeId);
    createUiNode(schemaNode[Keywords.Properties][key], child).forEach((v, k) => map.set(k, v));
  });

  return map.set(uiNode.nodeId, uiNode);
};
