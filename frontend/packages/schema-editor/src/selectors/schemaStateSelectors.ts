import { SchemaState } from '@altinn/schema-editor/types';
import { getNodeByPointer, getParentNodeByPointer, UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model'

export type SchemaStateSelector<T> = (state: SchemaState) => T;

export const uiSchemaSelector: SchemaStateSelector<UiSchemaNodes> =
  (state) => state.uiSchema;

export const selectedPropertyParentSelector: SchemaStateSelector<UiSchemaNode> =
  (state) => getParentNodeByPointer(state.uiSchema, state.selectedPropertyNodeId);

export const selectedIdSelector: SchemaStateSelector<string> =
  (state) => state.selectedEditorTab === 'properties'
    ? state.selectedPropertyNodeId
    : state.selectedDefinitionNodeId;

export const selectedItemSelector: SchemaStateSelector<UiSchemaNode> = (state: SchemaState) => {
  const selectedId = selectedIdSelector(state);
  return selectedId ? getNodeByPointer(state.uiSchema, selectedId) : undefined;
};

export const selectedDefinitionParentSelector: SchemaStateSelector<UiSchemaNode> =
  (state) => getParentNodeByPointer(state.uiSchema, state.selectedDefinitionNodeId);
