import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import { createContext, useContext } from 'react';
import type { CodeListValueType } from './types/CodeListValueType';

export type StudioCodeListEditorContextProps = {
  texts: CodeListEditorTexts;
  valueType: CodeListValueType;
};

export const StudioCodeListEditorContext = createContext<StudioCodeListEditorContextProps>(null);

export const useStudioCodeListEditorContext = () => useContext(StudioCodeListEditorContext);
