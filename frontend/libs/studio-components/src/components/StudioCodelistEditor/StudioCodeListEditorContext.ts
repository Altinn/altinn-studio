import type { CodeListTexts } from './types/CodeListTexts';
import { createContext, useContext } from 'react';

export type StudioCodeListEditorContextProps = {
  texts: CodeListTexts;
};

export const StudioCodeListEditorContext = createContext<StudioCodeListEditorContextProps>(null);

export const useStudioCodeListEditorContext = () => useContext(StudioCodeListEditorContext);
