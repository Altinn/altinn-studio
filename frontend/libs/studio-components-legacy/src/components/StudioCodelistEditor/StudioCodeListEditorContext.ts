import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import { createContext, useContext } from 'react';

export type StudioCodeListEditorContextProps = {
  texts: CodeListEditorTexts;
};

export const StudioCodeListEditorContext = createContext<StudioCodeListEditorContextProps>(null);

export const useStudioCodeListEditorContext = () => useContext(StudioCodeListEditorContext);
