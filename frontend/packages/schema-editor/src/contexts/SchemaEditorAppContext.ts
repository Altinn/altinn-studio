import { createContext } from 'react';
import type { SchemaModel } from '@altinn/schema-model';

export interface SchemaEditorAppContextProps {
  schemaModel: SchemaModel;
  save: (dataModel: SchemaModel, saveAfterMs?: number) => void;
  selectedTypePointer?: string;
  setSelectedTypePointer: (pointer: string) => void;
  selectedUniqueNodePointer?: string;
  setSelectedUniqueNodePointer: (pointer?: string) => void;
  name: string;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>(null);
