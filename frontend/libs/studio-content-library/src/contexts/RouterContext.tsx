import React, { createContext, useContext } from 'react';
import { useNavigation } from '../hooks/useNavigation';

export type RouterContextProps = {
  currentPage: string;
  navigate: (page: string) => void;
};

export const RouterContext = createContext<Partial<RouterContextProps>>(undefined);

export type RouterContextProviderProps = {
  children: React.ReactNode;
};

export const RouterContextProvider = ({ children }: Partial<RouterContextProviderProps>) => {
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

export const useRouterContext = (): Partial<RouterContextProps> => {
  const context = useContext(RouterContext);
  if (context === undefined) {
    throw new Error('useRouterContext must be used within a RouterContextProvider');
  }
  return context;
};
