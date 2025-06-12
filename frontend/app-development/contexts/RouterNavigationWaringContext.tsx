import React, { createContext, useContext, useState } from 'react';

export type RouterNavigationWarningProps = {
  markAsHasChanges: (pageName: string) => void;
  doPageHasChanges: (pageName: string) => boolean;
};

export const RouterNavigationWarningContext =
  createContext<Partial<RouterNavigationWarningProps>>(undefined);

export type LayoutContextProviderProps = {
  children: React.ReactNode;
};

export const RouterNavigationWarningProvider = ({
  children,
}: Partial<LayoutContextProviderProps>) => {
  const [pageChanges, setPageChanges] = useState(new Map<string, boolean>());

  const markAsHasChanges = (pageName: string): void => {
    setPageChanges((prev) => {
      const updated = new Map(prev);
      updated.set(pageName, true);
      return updated;
    });
  };

  const doPageHasChanges = (pageName: string): boolean => pageChanges.get(pageName) ?? false;

  return (
    <RouterNavigationWarningProvider.Provider
      value={{
        doPageHasChanges,
        markAsHasChanges,
      }}
    >
      {children}
    </RouterNavigationWarningProvider.Provider>
  );
};

export const useRouterNavigationWarningContext = (): Partial<RouterNavigationWarningProps> => {
  const context = useContext(RouterNavigationWarningContext);
  if (context === undefined) {
    throw new Error(
      'useRouterNavigationWarningContext must be used within a RouterNavigationWarningProvider',
    );
  }
  return context;
};
