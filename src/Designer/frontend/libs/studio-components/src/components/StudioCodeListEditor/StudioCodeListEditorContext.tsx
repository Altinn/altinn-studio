import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import React, { createContext, useContext } from 'react';

export type StudioCodeListEditorContextProps = {
  language: string;
  texts: CodeListEditorTexts;
};

const StudioCodeListEditorContext = createContext<StudioCodeListEditorContextProps | null>(null);

export function useStudioCodeListEditorContext(): StudioCodeListEditorContextProps {
  const context: StudioCodeListEditorContextProps | null = useContext(StudioCodeListEditorContext);
  /* istanbul ignore if */
  if (context === null) {
    throw new Error(
      'useStudioCodeListEditorContext must be used within a StudioCodeListEditorContextProvider',
    );
  }
  return context;
}

export function StudioCodeListEditorContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: StudioCodeListEditorContextProps;
}): React.ReactElement {
  return (
    <StudioCodeListEditorContext.Provider value={value}>
      {children}
    </StudioCodeListEditorContext.Provider>
  );
}
