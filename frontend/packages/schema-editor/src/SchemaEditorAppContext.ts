import { createContext } from 'react';

export interface SchemaEditorAppContextProps {
  modelPath: string;
}

export const SchemaEditorAppContext = createContext<SchemaEditorAppContextProps>({ modelPath: '' });
