/**
 * This file contains selectors that depend on the data model schema.
 */

import {
  getChildNodesByPointer,
  getNodeByPointer,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaNode,
  UiSchemaNodes
} from '@altinn/schema-model'
import { getDomFriendlyID } from '@altinn/schema-editor/utils/ui-schema-utils';

export type SchemaSelector<T> = (schema?: UiSchemaNodes) => T;

export const getRefNodeSelector =
  (currentNode: UiSchemaNode): SchemaSelector<UiSchemaNode> =>
    (schema: UiSchemaNodes) =>
      currentNode.objectKind === ObjectKind.Reference && currentNode.reference
        ? getNodeByPointer(schema, currentNode.reference)
        : undefined;

export const getFieldNodesSelector =
  (currentNode: UiSchemaNode): SchemaSelector<(UiSchemaNode & { domId: string })[]> =>
    (schema: UiSchemaNodes) =>
      getChildNodesByPointer(schema, currentNode.pointer).map((node) => ({
        ...node,
        domId: getDomFriendlyID(node.pointer),
      }));

export const getRootNodes: SchemaSelector<Map<string, UiSchemaNode>> = (schema: UiSchemaNodes) => {
  const nodesmap = new Map();
  if (schema?.length) {
    getChildNodesByPointer(schema, ROOT_POINTER).forEach((node) => {
      nodesmap.set(node.pointer, node);
    });
  }
  return nodesmap;
}

export const rootNodesSelector: SchemaSelector<Map<string, UiSchemaNode>> = (schema: UiSchemaNodes) => {
  const nodesmap: Map<string, UiSchemaNode> = new Map();
  if (schema.length) {
    getChildNodesByPointer(schema, ROOT_POINTER).forEach((node) => {
      nodesmap.set(node.pointer, node);
    });
  }
  return nodesmap;
}

export const rootChildrenSelector: SchemaSelector<string[] | undefined> =
  (schema: UiSchemaNodes) =>
    schema.length ? getNodeByPointer(schema, ROOT_POINTER).children : undefined;
