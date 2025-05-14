import React, { createContext, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';

type StudioCheckboxTableContextProps = {
  hasError?: boolean;
};

const StudioCheckboxTableContext = createContext<StudioCheckboxTableContextProps | undefined>(
  undefined,
);

export type StudioCheckboxTableContextProviderProps = {
  children: ReactNode;
} & StudioCheckboxTableContextProps;

export function StudioCheckboxTableContextProvider({
  children,
  hasError = false,
}: Partial<StudioCheckboxTableContextProviderProps>): ReactElement {
  return (
    <StudioCheckboxTableContext.Provider value={{ hasError }}>
      {children}
    </StudioCheckboxTableContext.Provider>
  );
}

export function useCheckboxTableContext(): StudioCheckboxTableContextProps {
  const context = useContext(StudioCheckboxTableContext);
  if (!context) {
    throw new Error(
      'StudioCheckboxTable compound components must be used within <StudioCheckboxTable>',
    );
  }
  return context;
}
