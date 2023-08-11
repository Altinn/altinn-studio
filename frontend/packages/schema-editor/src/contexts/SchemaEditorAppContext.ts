import { createContext } from 'react';

export interface SchemaEditorAppContextProps {
  modelPath: string;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>(null);
