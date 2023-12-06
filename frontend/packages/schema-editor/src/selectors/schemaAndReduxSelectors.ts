/**
 * This file contains selectors that depends on a combination of redux state and schema data.
 * They may be used as an input to the useSchemaAndReduxSelector hook to access the data.
 * The hook will first call the redux selector, and then pass the result to the schema selector.
 * This way is better than doing both operations simultaneously because it avoids unnecessary rerenders.
 */

import { SchemaState } from '@altinn/schema-editor/types';
import { SchemaModel, UiSchemaNode } from '@altinn/schema-model';
import { selectedIdSelector } from '@altinn/schema-editor/selectors/reduxSelectors';

export type SchemaAndReduxSelector<R, S> = {
  reduxSelector: (state: SchemaState) => R;
  schemaSelector: (reduxSelectorResult: R, schema: SchemaModel) => S;
};

export const selectedItemSelector: SchemaAndReduxSelector<string, UiSchemaNode> = {
  reduxSelector: selectedIdSelector,
  schemaSelector: (selectedId, schema) => (selectedId ? schema.getNode(selectedId) : undefined),
};

export const selectedPropertyParentSelector: SchemaAndReduxSelector<string, UiSchemaNode> = {
  reduxSelector: (state) => state.selectedPropertyNodeId,
  schemaSelector: (selectedId, schema) =>
    selectedId ? schema.getParentNode(selectedId) : undefined,
};

export const selectedDefinitionParentSelector: SchemaAndReduxSelector<string, UiSchemaNode> = {
  reduxSelector: (state) => state.selectedDefinitionNodeId,
  schemaSelector: (selectedId, schema) =>
    selectedId ? schema.getParentNode(selectedId) : undefined,
};
