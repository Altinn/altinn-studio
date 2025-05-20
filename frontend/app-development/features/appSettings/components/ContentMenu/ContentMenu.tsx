import React from 'react';
import type { ReactElement } from 'react';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { StudioContentMenu } from '@studio/components';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import type { SettingsModalTabId } from 'app-development/types/SettingsModalTabId';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';

export type ContentMenuProps = {
  currentTab: SettingsModalTabId;
  onChangeTab: (tabId: SettingsModalTabId) => void;
};

export function ContentMenu({ currentTab, onChangeTab }: ContentMenuProps): ReactElement {
  const menuTabConfigs = useAppSettingsMenuTabConfigs();
  // const menuTabs = filterFeatureFlag(menuTabConfigs);

  return (
    <StudioContentMenu selectedTabId={currentTab} onChangeTab={onChangeTab}>
      <ContentMenuTabs tabs={menuTabConfigs} />
    </StudioContentMenu>
  );
}

type ContentMenuTabsProps = {
  tabs: StudioContentMenuButtonTabProps<SettingsModalTabId>[];
};
function ContentMenuTabs({ tabs }: ContentMenuTabsProps): ReactElement[] {
  return tabs.map((tab) => (
    <StudioContentMenu.ButtonTab
      key={tab.tabId}
      icon={tab.icon}
      tabId={tab.tabId}
      tabName={tab.tabName}
    />
  ));
}

function filterFeatureFlag(
  menuTabConfigs: Array<StudioContentMenuButtonTabProps<SettingsModalTabId>>,
) {
  return shouldDisplayFeature(FeatureFlag.Maskinporten)
    ? menuTabConfigs
    : menuTabConfigs.filter((tab) => tab.tabId !== 'maskinporten');
}
