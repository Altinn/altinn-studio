/**
 * This file contains selectors that depend on the Redux state.
 * They may be used as an input to Redux's useSelector hook to access the data.
 */

import { SchemaState } from '@altinn/schema-editor/types';

export type ReduxSelector<T> = (state: SchemaState) => T;

export const selectedIdSelector: ReduxSelector<string> =
  (state) => state.selectedEditorTab === 'properties'
    ? state.selectedPropertyNodeId
    : state.selectedDefinitionNodeId;
