import React, { Children, forwardRef, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioContentMenuBase } from './StudioContentMenuBase';

export type StudioContentMenuProps<TabId extends string> = {
  children: ReactNode;
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
  isControlled?: boolean;
};

function StudioContentMenuForwarded<TabId extends string>(
  { children, selectedTabId, onChangeTab, isControlled }: StudioContentMenuProps<TabId>,
  ref: React.Ref<HTMLDivElement>,
): ReactElement {
  const firstTabId = getFirstTabId(children);
  const [selectedTab, setSelectedTab] = useState<TabId>(selectedTabId ?? firstTabId);

  useEffect(() => {
    if (isControlled) {
      setSelectedTab(selectedTabId);
    }
  }, [selectedTabId, isControlled]);

  const handleChangeTab = (tabId: TabId) => {
    onChangeTab(tabId);
    if (!isControlled) {
      setSelectedTab(tabId);
    }
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
