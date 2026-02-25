import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

// Minimal interface — only what app-components actually need
type TranslationParams = (string | number | undefined)[];
type TranslateFn = (key: string, params?: TranslationParams) => string;
type TranslateComponent = (args: {
  tKey: string;
  params?: TranslationParams;
}) => string | React.JSX.Element | React.JSX.Element[] | null;

type AppComponentsContextProps = {
  translate: TranslateFn;
  TranslateComponent: TranslateComponent;
};
const AppComponentsContext = createContext<AppComponentsContextProps | null>(null);

export function AppComponentsProvider({
  translate,
  TranslateComponent,
  children,
}: PropsWithChildren<AppComponentsContextProps>) {
  return (
    <AppComponentsContext.Provider value={{ translate, TranslateComponent }}>{children}</AppComponentsContext.Provider>
  );
}

export function useTranslation(): AppComponentsContextProps {
  const context = useContext(AppComponentsContext);
  if (!context) {
    throw new Error('AppComponentsProvider missing');
  }
  return context;
}
