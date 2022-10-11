import type { JsonSchemaNode, UiSchemaNode, UiSchemaNodes } from './types';
import { Keywords, ObjectKind } from './types';
import { createNodeBase, getCombinationKind, getObjectKind, schemaTypeIsNillable } from './utils';
import { findCustomAttributes } from './mappers/custom-properties';
import { findRestrictionsOnNode } from './restrictions';
import { findUiFieldType } from './mappers/field-type';
import { findGenericKeywordsOnNode, findReference } from './mappers/generic';
import { ROOT_POINTER } from './constants';

/**
 * Recursive function that traverse the json schema tree. This should not be accessed directly but through `toUiSchema`
 *
 * @param schemaNode
 * @param uiNode
 */
const createUiNode = (schemaNode: JsonSchemaNode, uiNode: UiSchemaNode): UiSchemaNodes => {
  uiNode.objectKind = getObjectKind(schemaNode);
  uiNode.custom = findCustomAttributes(schemaNode);
  uiNode.restrictions = findRestrictionsOnNode(schemaNode);
  uiNode.fieldType = findUiFieldType(schemaNode);
  uiNode.implicitType = schemaNode[Keywords.Type] === undefined;
  uiNode.ref = findReference(schemaNode[Keywords.Reference]);
  uiNode.isNillable = schemaTypeIsNillable(schemaNode[Keywords.Type]);
  Object.assign(uiNode, findGenericKeywordsOnNode(schemaNode));
  const uiSchemaNodes: UiSchemaNode[] = [uiNode];

  // Combinations
  if (uiNode.objectKind === ObjectKind.Combination) {
    const kind = getCombinationKind(schemaNode);
    schemaNode[kind].forEach((childNode: JsonSchemaNode, index: number) => {
      const child = createNodeBase(uiNode.pointer, kind, index.toString());
      child.isCombinationItem = true;
      uiNode.children.push(child.pointer);
      uiSchemaNodes.push(...createUiNode(childNode, child));
    });
  }

  // Arrays
  if (uiNode.objectKind === ObjectKind.Array && schemaNode[Keywords.Items]) {
    const child = createNodeBase(uiNode.pointer, Keywords.Items);
    uiNode.children.push(child.pointer);
    uiSchemaNodes.push(...createUiNode(schemaNode[Keywords.Items], child));
  }

  // Definitions
  const definitionsNodes = schemaNode[Keywords.Definitions] ?? schemaNode[Keywords.DeprecatedDefinitions] ?? {};
  Object.keys(definitionsNodes).forEach((key) => {
    const child = createNodeBase(uiNode.pointer, Keywords.Definitions, key);
    uiNode.children.push(child.pointer);
    uiSchemaNodes.push(...createUiNode(definitionsNodes[key], child));
  });

  // Properties
  Object.keys(schemaNode[Keywords.Properties] ?? {}).forEach((key) => {
    const child = createNodeBase(uiNode.pointer, Keywords.Properties, key);
    child.isRequired = !!schemaNode.required?.includes(key);
    uiNode.children.push(child.pointer);
    uiSchemaNodes.push(...createUiNode(schemaNode[Keywords.Properties][key], child));
  });
  return uiSchemaNodes;
};

export const buildUiSchema = (jsonSchema: JsonSchemaNode): UiSchemaNodes => {
  const uiNodeMap = createUiNode(jsonSchema, createNodeBase(ROOT_POINTER));
  // Just resolve references when we are dealing with the root, all items is resolved at this point.
  const lookup = new Map();
  uiNodeMap.forEach((item) => lookup.set(item.pointer, item.fieldType));
  uiNodeMap.forEach((item) => {
    if (typeof item.ref === 'string' && item.fieldType === undefined) {
      // just inherit the field type
      item.fieldType = lookup.get(item.ref);
    }
  });

  return uiNodeMap;
};
