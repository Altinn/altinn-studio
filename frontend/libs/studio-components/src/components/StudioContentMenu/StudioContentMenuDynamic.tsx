import React, { Children, forwardRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { StudioContentMenuBaseProps } from './StudioContentMenuBase';
import { StudioContentMenuBase } from './StudioContentMenuBase';

function StudioContentMenuDynamicForwarded<TabId extends string>(
  { children, selectedTabId, onChangeTab }: StudioContentMenuBaseProps<TabId>,
  ref: React.Ref<HTMLDivElement>,
): ReactElement {
  const firstTabId: TabId = getFirstTabId<TabId>(children);
  const [selectedTab, setSelectedTab] = useState<TabId>(selectedTabId ?? firstTabId);

  const handleChangeTab = (tabId: TabId): void => {
    onChangeTab(tabId);
    setSelectedTab(tabId);
  };

  return (
    <StudioContentMenuBase ref={ref} selectedTabId={selectedTab} onChangeTab={handleChangeTab}>
      {children}
    </StudioContentMenuBase>
  );
}

export const StudioContentMenuDynamic = forwardRef<
  HTMLDivElement,
  StudioContentMenuBaseProps<string>
>(StudioContentMenuDynamicForwarded);

function getFirstTabId<TabId extends string>(children: ReactNode): TabId {
  return Children.toArray(children).filter((child): child is ReactElement<{ tabId: TabId }> =>
    React.isValidElement(child),
  )[0]?.props.tabId;
}
