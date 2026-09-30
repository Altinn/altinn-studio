import { createContext } from 'react';
import type { SchemaModel } from '@altinn/schema-model';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';

export interface SchemaEditorAppContextProps {
  schemaModel: SchemaModel;
  save: (dataModel: SchemaModel, saveAfterMs?: number) => void;
  selectedTypePointer?: string;
  setSelectedTypePointer: (pointer: string) => void;
  selectedUniquePointer?: string;
  setSelectedUniquePointer: (pointer?: string) => void;
  name: string;
  prefillConfig: PrefillConfig;
  savePrefillConfig: (prefillConfig: PrefillConfig) => void;
}

/**
 * Context to used for the parts of the schema editor that depend on a given model to be selected.
 */
export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>(null);
