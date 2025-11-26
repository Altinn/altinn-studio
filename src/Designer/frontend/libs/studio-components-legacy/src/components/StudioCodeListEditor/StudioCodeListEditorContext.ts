import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import { createContext, useContext } from 'react';

export type StudioCodeListEditorContextProps = {
  texts: CodeListEditorTexts;
};

export const StudioCodeListEditorContext = createContext<StudioCodeListEditorContextProps | null>(
  null,
);

export const useStudioCodeListEditorContext = (): StudioCodeListEditorContextProps => {
  const props = useContext(StudioCodeListEditorContext);
  /* istanbul ignore else */
  if (props) return props;
  else
    throw new Error(
      'useStudioCodeListEditorContext must be used within a StudioCodeListEditorContext.Provider with given props.',
    );
};
