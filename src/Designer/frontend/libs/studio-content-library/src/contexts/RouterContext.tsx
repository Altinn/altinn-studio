import React, { createContext, useContext } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import type { PageName } from '../types/PageName';

export type RouterContextProps = {
  currentPage: PageName;
  navigate: (page: PageName) => void;
};

export const RouterContext = createContext<RouterContextProps>(undefined);

export type RouterContextProviderProps = {
  children: React.ReactNode;
};

export const RouterContextProvider = ({ children }: RouterContextProviderProps) => {
  const { navigate, currentPage } = useNavigation();

  return (
    <RouterContext.Provider
      value={{
        currentPage,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouterContext = (): RouterContextProps => {
  const context = useContext(RouterContext);
  if (context === undefined) {
    throw new Error('useRouterContext must be used within a RouterContextProvider');
  }
  return context;
};
