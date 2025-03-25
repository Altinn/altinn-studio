import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type GiteaHeaderContextProps = {
  owner: string;
  repoName: string;
};

export const GiteaHeaderContext = createContext<GiteaHeaderContextProps>(undefined);

export type GiteaHeaderContextProviderProps = {
  children: ReactNode;
} & GiteaHeaderContextProps;

export const GiteaHeaderContextProvider = ({
  children,
  owner,
  repoName,
}: GiteaHeaderContextProviderProps) => {
  return (
    <GiteaHeaderContext.Provider
      value={{
        owner,
        repoName,
      }}
    >
      {children}
    </GiteaHeaderContext.Provider>
  );
};

export const useGiteaHeaderContext = (): Partial<GiteaHeaderContextProps> => {
  const context = useContext(GiteaHeaderContext);
  if (context === undefined) {
    throw new Error('useGiteaHeaderContext must be used within a GiteaHeaderContextProvider');
  }
  return context;
};
