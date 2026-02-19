import React, { createContext, useContext } from 'react';

// Minimal interface — only what app-components actually need
type TranslateFn = (key: string, params?: (string | number | undefined)[]) => string;

const AppComponentsContext = createContext<TranslateFn | null>(null);

export function AppComponentsProvider({ t, children }: { t: TranslateFn; children: React.ReactNode }) {
  return <AppComponentsContext.Provider value={t}>{children}</AppComponentsContext.Provider>;
}

export function useTranslation(): TranslateFn {
  const t = useContext(AppComponentsContext);
  if (!t) {
    throw new Error('AppComponentsProvider missing');
  }
  return t;
}
