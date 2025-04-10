import React, { createContext, useContext } from 'react';
import type { ReactNode, ReactElement } from 'react';

type PagesContextProps = {
  repoOwnerIsOrg: boolean;
};

export const PagesContext = createContext<PagesContextProps>(undefined);

export type PagesContextProviderProps = {
  children: ReactNode;
} & PagesContextProps;

export const PagesContextProvider = ({
  children,
  repoOwnerIsOrg,
}: Partial<PagesContextProviderProps>): ReactElement => {
  return (
    <PagesContext.Provider
      value={{
        repoOwnerIsOrg,
      }}
    >
      {children}
    </PagesContext.Provider>
  );
};

export const usePagesContext = (): PagesContextProps => {
  const context = useContext(PagesContext);
  if (context === undefined) {
    throw new Error('usePagesContext must be used within a PagesContextProvider');
  }
  return context;
};
