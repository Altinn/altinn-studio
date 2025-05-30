import React from 'react';
import type { ReactElement } from 'react';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { StudioContentMenu } from '@studio/components';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';
import { getCurrentSettingsTab } from '../../utils';

export type ContentMenuProps = {
  onChangeTab: (tabId: SettingsPageTabId) => void;
};

export function ContentMenu({ onChangeTab }: ContentMenuProps): ReactElement {
  const menuTabConfigs = useAppSettingsMenuTabConfigs();
  const menuTabs = filterFeatureFlag(menuTabConfigs);

  // TODO - WHY IS THE COLOR IN CONTENT MENU NOT CORRECT WHEN CANCELING THE BLOCKER
  const currentTab: SettingsPageTabId = getCurrentSettingsTab();

  return (
    <StudioContentMenu selectedTabId={currentTab} onChangeTab={onChangeTab}>
      <ContentMenuTabs tabs={menuTabs} />
    </StudioContentMenu>
  );
}

type ContentMenuTabsProps = {
  tabs: StudioContentMenuButtonTabProps<SettingsPageTabId>[];
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
  menuTabConfigs: Array<StudioContentMenuButtonTabProps<SettingsPageTabId>>,
) {
  return shouldDisplayFeature(FeatureFlag.Maskinporten)
    ? menuTabConfigs
    : menuTabConfigs.filter((tab) => tab.tabId !== 'maskinporten');
}
