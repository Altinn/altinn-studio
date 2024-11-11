import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioContentMenu.module.css';
import { StudioContentMenuContextProvider } from './context/StudioContentMenuContext';

export type StudioContentMenuBaseProps<TabId extends string> = {
  children: ReactNode;
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

function StudioContentMenuBaseForwarded<TabId extends string>(
  { children, selectedTabId, onChangeTab }: StudioContentMenuBaseProps<TabId>,
  ref: React.Ref<HTMLDivElement>,
): ReactElement {
  const handleChangeTab = (tabId: TabId) => {
    onChangeTab(tabId);
  };

  const isTabSelected = (tabId: TabId) => selectedTabId === tabId;

  return (
    <div ref={ref} className={classes.menuContainer}>
      <div ref={ref} className={classes.tabsContainer} role='tablist'>
        <StudioContentMenuContextProvider
          isTabSelected={isTabSelected}
          onChangeTab={handleChangeTab}
        >
          {children}
        </StudioContentMenuContextProvider>
      </div>
    </div>
  );
}

export const StudioContentMenuBase = forwardRef<HTMLDivElement, StudioContentMenuBaseProps<string>>(
  StudioContentMenuBaseForwarded,
);
