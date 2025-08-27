import React, { type ReactNode, createContext, useContext } from 'react';

export type StudioContentMenuContextProps<TabId extends string> = {
  isTabSelected: (tabId: TabId) => boolean;
  onChangeTab: (tabId: TabId) => void;
};

const StudioContentMenuContext =
  createContext<Partial<StudioContentMenuContextProps<string>>>(undefined);

export type StudioContentMenuContextProviderProps<TabId extends string> = {
  children: ReactNode;
} & StudioContentMenuContextProps<TabId>;

export function StudioContentMenuContextProvider<TabId extends string>({
  children,
  isTabSelected,
  onChangeTab,
}: Partial<StudioContentMenuContextProviderProps<TabId>>) {
  return (
    <StudioContentMenuContext.Provider value={{ isTabSelected, onChangeTab }}>
      {children}
    </StudioContentMenuContext.Provider>
  );
}

export const useStudioContentMenuContext = <TabId extends string>(): Partial<
  StudioContentMenuContextProps<TabId>
> => {
  const context = useContext(StudioContentMenuContext) as Partial<
    StudioContentMenuContextProps<TabId>
  >;
  if (context === undefined) {
    throw new Error(
      'useStudioContentMenuContext must be used within a StudioContentMenuContextProvider',
    );
  }
  return context;
};
