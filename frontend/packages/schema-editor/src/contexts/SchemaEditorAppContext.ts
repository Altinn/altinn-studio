import { createContext } from 'react';
import type { SchemaModel } from '@altinn/schema-model';

export interface SchemaEditorAppContextProps {
  schemaModel: SchemaModel;
  save: (datamodel: SchemaModel, saveAfterMs?: number) => void;
  selectedTypePointer?: string;
  setSelectedTypePointer: (pointer: string) => void;
  selectedNodePointer?: string;
  setSelectedNodePointer: (pointer?: string) => void;
  name: string;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>(null);
