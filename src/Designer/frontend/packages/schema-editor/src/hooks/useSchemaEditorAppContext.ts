import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { useContext } from 'react';

export const useSchemaEditorAppContext = (): SchemaEditorAppContextProps => {
  const context = useContext(SchemaEditorAppContext);
  if (!context) {
    throw new Error(
      'useSchemaEditorAppContext must be used within a SchemaEditorAppContextProvider.',
    );
  }
  return context;
};
