import { JsonSchemaNode, Keywords, ROOT_POINTER, UiSchemaMap, UiSchemaNode } from './types';
import {
  createNodeBase,
  createPointerLookupTable,
  getCombinationKind,
  getObjectKind,
  resetNodeIds,
  schemaTypeIsNillable,
} from './utils';
import { handleCustomProperties } from './handlers/custom-properties';
import { handleRestrictions } from './handlers/restrictions';
import { getUiFieldType } from './handlers/field-type';
import { handleGenericKeywords } from './handlers/generic';
import { ObjectKind } from '../types/enums';

/**
 * Recursive function that traverse the json schema tree. This should not be accessed directly but through `toUiSchema`
 *
 * @param schemaNode
 * @param uiNode
 */
const createUiNode = (schemaNode: JsonSchemaNode, uiNode: UiSchemaNode): UiSchemaMap => {
  uiNode.objectKind = getObjectKind(schemaNode);
  uiNode.custom = handleCustomProperties(schemaNode);
  uiNode.restrictions = handleRestrictions(schemaNode);
  uiNode.fieldType = getUiFieldType(schemaNode);
  uiNode.implicitType = !schemaNode.type;
  uiNode.ref = schemaNode[Keywords.Reference];
  uiNode.isNillable = schemaTypeIsNillable(schemaNode.type);

  Object.assign(uiNode, handleGenericKeywords(schemaNode));

  const map: UiSchemaMap = new Map();
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

export const buildUiSchema = (jsonSchema: JsonSchemaNode): UiSchemaMap => {
  resetNodeIds();
  const map = createUiNode(jsonSchema, createNodeBase(ROOT_POINTER));

  // Just resolve references when we are dealing with the root, all items is resolved at this point.
  const lookup = createPointerLookupTable(map);
  map.forEach((item) => {
    if (typeof item.ref === 'string') {
      // is a pointer
      const refNodeId = lookup.get(item.ref) as number;
      const refNode = map.get(refNodeId) as UiSchemaNode;
      item.ref = refNodeId;
      if (item.fieldType === undefined) {
        // just inherit the field type
        item.fieldType = refNode.fieldType;
      }
    }
  });
  return map;
};
