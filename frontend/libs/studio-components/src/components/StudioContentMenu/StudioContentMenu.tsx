import React, { Children, forwardRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioContentMenuBase } from './StudioContentMenuBase';

export type StudioContentMenuProps<TabId extends string> = {
  children: ReactNode;
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

function StudioContentMenuForwarded<TabId extends string>(
  { children, selectedTabId, onChangeTab }: StudioContentMenuProps<TabId>,
  ref: React.Ref<HTMLDivElement>,
): ReactElement {
  const firstTabId = getFirstTabId(children);
  const [selectedTab, setSelectedTab] = useState<TabId>(selectedTabId ?? firstTabId);

  const handleChangeTab = (tabId: TabId) => {
    onChangeTab(tabId);
    setSelectedTab(tabId);
  };

  return (
    <StudioContentMenuBase ref={ref} selectedTabId={selectedTab} onChangeTab={handleChangeTab}>
      {children}
    </StudioContentMenuBase>
  );
}

export const StudioContentMenu = forwardRef<HTMLDivElement, StudioContentMenuProps<string>>(
  StudioContentMenuForwarded,
);

const getFirstTabId = (children: ReactNode) => {
  return Children.toArray(children).filter((child): child is ReactElement =>
    React.isValidElement(child),
  )[0]?.props.tabId;
};
