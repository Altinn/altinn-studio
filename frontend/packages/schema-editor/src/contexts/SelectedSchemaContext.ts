import { createContext } from 'react';

export interface SelectedSchemaContextProps {
  modelPath: string;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SelectedSchemaContext = createContext<SelectedSchemaContextProps>(null);
