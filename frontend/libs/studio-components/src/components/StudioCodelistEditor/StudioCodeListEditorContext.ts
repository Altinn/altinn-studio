import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import { createContext, useContext } from 'react';
import type { CodeListType } from './types/CodeListType';

export type StudioCodeListEditorContextProps = {
  texts: CodeListEditorTexts;
  codeListType: CodeListType;
};

export const StudioCodeListEditorContext = createContext<StudioCodeListEditorContextProps>(null);

export const useStudioCodeListEditorContext = () => useContext(StudioCodeListEditorContext);
