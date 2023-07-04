import { SchemaState } from '@altinn/schema-editor/types';
import {
  getChildNodesByPointer,
  getNodeByPointer,
  getParentNodeByPointer,
  ObjectKind, ROOT_POINTER,
  UiSchemaNode,
  UiSchemaNodes
} from '@altinn/schema-model'
import { getDomFriendlyID } from '@altinn/schema-editor/utils/ui-schema-utils';

export type SchemaStateSelector<T> = (state: SchemaState, schema?: UiSchemaNodes) => T;

export const selectedPropertyParentSelector: SchemaStateSelector<UiSchemaNode> =
  (state, schema: UiSchemaNodes) => getParentNodeByPointer(schema, state.selectedPropertyNodeId);

export const selectedIdSelector: SchemaStateSelector<string> =
  (state) => state.selectedEditorTab === 'properties'
    ? state.selectedPropertyNodeId
    : state.selectedDefinitionNodeId;

export const selectedItemSelector: SchemaStateSelector<UiSchemaNode> = (state: SchemaState, schema: UiSchemaNodes) => {
  const selectedId = selectedIdSelector(state);
  return selectedId ? getNodeByPointer(schema, selectedId) : undefined;
};

export const selectedDefinitionParentSelector: SchemaStateSelector<UiSchemaNode> =
  (state, schema) => getParentNodeByPointer(schema, state.selectedDefinitionNodeId);

export const getRefNodeSelector =
  (currentNode: UiSchemaNode): SchemaStateSelector<UiSchemaNode> =>
    (state: SchemaState, schema: UiSchemaNodes) =>
      currentNode.objectKind === ObjectKind.Reference && currentNode.reference
        ? getNodeByPointer(schema, currentNode.reference)
        : undefined;

export const getFieldNodesSelector =
  (currentNode: UiSchemaNode): SchemaStateSelector<(UiSchemaNode & { domId: string })[]> =>
    (state: SchemaState, schema: UiSchemaNodes) =>
      getChildNodesByPointer(schema, currentNode.pointer).map((node) => ({
        ...node,
        domId: getDomFriendlyID(node.pointer),
      }));

export const rootNodesSelector: SchemaStateSelector<Map<string, UiSchemaNode>> = (state: SchemaState, schema: UiSchemaNodes) => {
  const nodesmap = new Map();
  if (schema.length) {
    getChildNodesByPointer(schema, ROOT_POINTER).forEach((node) => {
      nodesmap.set(node.pointer, node);
    });
  }
  return nodesmap;
}

export const rootChildrenSelector: SchemaStateSelector<string[] | undefined> =
  (state: SchemaState, schema: UiSchemaNodes) =>
    schema.length ? getNodeByPointer(schema, ROOT_POINTER).children : undefined;
