import { createContext } from 'react';
import { UiSchemaNodes } from '@altinn/schema-model';

export interface SchemaEditorAppContextProps {
  data: UiSchemaNodes;
  save: (datamodel: UiSchemaNodes) => void;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>(null);
