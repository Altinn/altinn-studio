import { createContext } from 'react';
import { SchemaModel } from '@altinn/schema-model';

export interface SchemaEditorAppContextProps {
  schemaModel: SchemaModel;
  save: (datamodel: SchemaModel, saveAfterMs?: number) => void;
  selectedTypePointer?: string;
  setSelectedTypePointer: (pointer: string) => void;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>(null);
