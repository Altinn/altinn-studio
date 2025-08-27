import React from 'react';
import type { ReactElement } from 'react';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { StudioContentMenu } from 'libs/studio-components/src';
import type { StudioContentMenuButtonTabProps } from 'libs/studio-components/src';
import type { SettingsPageTabId } from '../../../../types/SettingsPageTabId';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';
import { useCurrentSettingsTab } from '../../hooks/useCurrentSettingsTab';

export function ContentMenu(): ReactElement {
  const menuTabConfigs = useAppSettingsMenuTabConfigs();
  const menuTabs = filterFeatureFlag(menuTabConfigs);
  const tabIds: SettingsPageTabId[] = extractTabIdsFromTabs(menuTabs);
  const { tabToDisplay, setTabToDisplay } = useCurrentSettingsTab(tabIds);

  return (
    <StudioContentMenu selectedTabId={tabToDisplay} onChangeTab={setTabToDisplay}>
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

function extractTabIdsFromTabs(tabs: StudioContentMenuButtonTabProps<SettingsPageTabId>[]) {
  return tabs.map(({ tabId }) => tabId);
}
