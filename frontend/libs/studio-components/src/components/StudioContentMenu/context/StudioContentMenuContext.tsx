import React, { type ReactNode, createContext, useContext } from 'react';

export type StudioContentMenuContextProps<TabId extends string> = {
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

export const StudioContentMenuContext =
  createContext<Partial<StudioContentMenuContextProps<string>>>(undefined);

export type StudioContentMenuContextProviderProps<TabId extends string> = {
  children: ReactNode;
} & StudioContentMenuContextProps<TabId>;

export function StudioContentMenuContextProvider<TabId extends string>({
  children,
  selectedTabId,
  onChangeTab,
}: Partial<StudioContentMenuContextProviderProps<TabId>>) {
  return (
    <StudioContentMenuContext.Provider value={{ selectedTabId, onChangeTab }}>
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
