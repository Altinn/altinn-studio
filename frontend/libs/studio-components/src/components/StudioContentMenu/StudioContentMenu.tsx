import React, { Children, forwardRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioContentMenu.module.css';
import { StudioContentMenuContextProvider } from './context/StudioContentMenuContext';
import type { StudioMenuTabType } from './types/StudioMenuTabType';

export type StudioContentMenuProps<TabId extends string> = {
  children: ReactNode;
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

function StudioContentMenuForwarded<TabId extends string>(
  { children, selectedTabId, onChangeTab }: StudioContentMenuProps<TabId>,
  ref: React.Ref<HTMLDivElement>,
): ReactElement {
  const firstTabId = Children.toArray(children).filter(
    (child): child is ReactElement<StudioMenuTabType<TabId>> => React.isValidElement(child),
  )[0]?.props.tabId;
  const [selectedTab, setSelectedTab] = useState<string>(selectedTabId ?? firstTabId);
  const handleChangeTab = (tabId: TabId) => {
    onChangeTab(tabId);
    setSelectedTab(tabId);
  };

  return (
    <div ref={ref} className={classes.tabsContainer} role='tablist'>
      <StudioContentMenuContextProvider selectedTabId={selectedTab} onChangeTab={handleChangeTab}>
        {children}
      </StudioContentMenuContextProvider>
    </div>
  );
}

export const StudioContentMenu = forwardRef<HTMLDivElement, StudioContentMenuProps<string>>(
  StudioContentMenuForwarded,
);
