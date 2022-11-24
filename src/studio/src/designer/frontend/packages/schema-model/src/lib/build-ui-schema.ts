import type { Dict, UiSchemaNode, UiSchemaNodes } from './types';
import { JsonSchemaType, Keywords, ObjectKind } from './types';
import { createNodeBase, getCombinationKind, getObjectKind, makePointer, schemaTypeIsNillable } from './utils';
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
const createUiNode = (schemaNode: Dict, uiNode: UiSchemaNode): UiSchemaNodes => {
  if (schemaNode[Keywords.Type] === JsonSchemaType.Array || schemaNode[Keywords.Items]) {
    // Arrays
    uiNode.isArray = true;
    uiNode.isNillable = schemaTypeIsNillable(schemaNode[Keywords.Type]);
    Object.assign(uiNode.restrictions, findRestrictionsOnNode(schemaNode));
    Object.assign(uiNode.custom, findCustomAttributes(schemaNode));
    // If the items keyword exists we will merge the two nodes with this node as base.
    return schemaNode[Keywords.Items] ? createUiNode(schemaNode[Keywords.Items], uiNode) : [uiNode];
  } else {
    // Other fields
    uiNode.objectKind = getObjectKind(schemaNode);
    if (!uiNode.isArray) {
      uiNode.isNillable = schemaTypeIsNillable(schemaNode[Keywords.Type]);
    }

    uiNode.fieldType = findUiFieldType(schemaNode);
    uiNode.implicitType = schemaNode[Keywords.Type] === undefined;
    uiNode.ref = findReference(schemaNode[Keywords.Reference]);
    Object.assign(uiNode.custom, findCustomAttributes(schemaNode));
    Object.assign(uiNode.restrictions, findRestrictionsOnNode(schemaNode));
    Object.assign(uiNode, findGenericKeywordsOnNode(schemaNode));
    const uiSchemaNodes: UiSchemaNode[] = [uiNode];

    const pointerBase = uiNode.isArray ? makePointer(uiNode.pointer, Keywords.Items) : uiNode.pointer;

    // Combinations
    if (uiNode.objectKind === ObjectKind.Combination) {
      const kind = getCombinationKind(schemaNode);
      schemaNode[kind].forEach((childNode: Dict, index: number) => {
        const child = createNodeBase(pointerBase, kind, index.toString());
        child.isCombinationItem = true;
        uiNode.children.push(child.pointer);
        uiSchemaNodes.push(...createUiNode(childNode, child));
      });
    }

    // Definitions
    const definitionsNodes = schemaNode[Keywords.Definitions] ?? schemaNode[Keywords.DeprecatedDefinitions] ?? {};
    Object.keys(definitionsNodes).forEach((key) => {
      const child = createNodeBase(pointerBase, Keywords.Definitions, key);
      uiNode.children.push(child.pointer);
      uiSchemaNodes.push(...createUiNode(definitionsNodes[key], child));
    });

    // Properties
    Object.keys(schemaNode[Keywords.Properties] ?? {}).forEach((key) => {
      const child = createNodeBase(pointerBase, Keywords.Properties, key);
      child.isRequired = !!schemaNode.required?.includes(key);
      uiNode.children.push(child.pointer);
      uiSchemaNodes.push(...createUiNode(schemaNode[Keywords.Properties][key], child));
    });
    return uiSchemaNodes;
  }
};

export const buildUiSchema = (jsonSchema: Dict): UiSchemaNodes => {
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
