import {
  JsonSchemaNode,
  Keywords,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaMap,
  UiSchemaNode,
} from './types';
import { createNodeBase, getCombinationKind, getObjectKind, schemaTypeIsNillable } from './utils';
import { handleCustomProperties } from './handlers/custom-properties';
import { findRestrictionsOnNode } from './restrictions';
import { getUiFieldType } from './handlers/field-type';
import { findGenericKeywordsOnNode } from './handlers/generic';
import { getNodeByPointer } from './selectors';

/**
 * Recursive function that traverse the json schema tree. This should not be accessed directly but through `toUiSchema`
 *
 * @param schemaNode
 * @param uiNode
 */
const createUiNode = (schemaNode: JsonSchemaNode, uiNode: UiSchemaNode): UiSchemaMap => {
  uiNode.objectKind = getObjectKind(schemaNode);
  uiNode.custom = handleCustomProperties(schemaNode);
  uiNode.restrictions = findRestrictionsOnNode(schemaNode);
  uiNode.fieldType = getUiFieldType(schemaNode);
  uiNode.implicitType = !schemaNode[Keywords.Type];
  uiNode.ref = schemaNode[Keywords.Reference];
  uiNode.isNillable = schemaTypeIsNillable(schemaNode[Keywords.Type]);
  Object.assign(uiNode, findGenericKeywordsOnNode(schemaNode));
  const map: UiSchemaMap = new Map();

  // Combinations
  if (uiNode.objectKind === ObjectKind.Combination) {
    const kind = getCombinationKind(schemaNode);
    schemaNode[kind].forEach((childNode: JsonSchemaNode, index: number) => {
      const child = createNodeBase(uiNode.pointer, kind, index.toString());
      uiNode.children.push(child.pointer);
      createUiNode(childNode, child).forEach((i, k) => map.set(k, i));
    });
  }

  // Arrays
  if (uiNode.objectKind === ObjectKind.Array && schemaNode[Keywords.Items]) {
    const child = createNodeBase(uiNode.pointer, Keywords.Items);
    uiNode.children.push(child.pointer);
    createUiNode(schemaNode[Keywords.Items], child).forEach((i, k) => map.set(k, i));
  }

  // Definitions
  Object.keys(schemaNode[Keywords.Definitions] ?? {}).forEach((key) => {
    const child = createNodeBase(uiNode.pointer, Keywords.Definitions, key);
    uiNode.children.push(child.pointer);
    createUiNode(schemaNode[Keywords.Definitions][key], child).forEach((v, k) => map.set(k, v));
  });

  // Properties
  Object.keys(schemaNode[Keywords.Properties] ?? {}).forEach((key) => {
    const child = createNodeBase(uiNode.pointer, Keywords.Properties, key);
    child.isRequired = !!schemaNode.required?.includes(key);
    uiNode.children.push(child.pointer);
    createUiNode(schemaNode[Keywords.Properties][key], child).forEach((v, k) => map.set(k, v));
  });

  return map.set(uiNode.pointer, uiNode);
};

export const buildUiSchema = (jsonSchema: JsonSchemaNode): UiSchemaMap => {
  const uiNodeMap = createUiNode(jsonSchema, createNodeBase(ROOT_POINTER));
  // Just resolve references when we are dealing with the root, all items is resolved at this point.
  uiNodeMap.forEach((item) => {
    if (typeof item.ref === 'string') {
      if (uiNodeMap.has(item.ref)) {
        const refNode = getNodeByPointer(uiNodeMap, item.ref);
        if (item.fieldType === undefined) {
          // just inherit the field type
          item.fieldType = refNode.fieldType;
        }
      } else {
        throw Error(`Refered uiNode was not found ${item.ref}`);
      }
    }
  });
  return uiNodeMap;
};
