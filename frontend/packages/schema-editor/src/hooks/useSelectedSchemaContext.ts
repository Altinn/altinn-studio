import { SelectedSchemaContext } from '@altinn/schema-editor/contexts/SelectedSchemaContext';
import { useContext } from 'react';

export const useSelectedSchemaContext = () => {
  const context = useContext(SelectedSchemaContext);
  if (!context) {
    throw new Error('useSelectedSchemaContext must be used within a SelectedSchemaContextProvider.');
  }
  return context;
};
