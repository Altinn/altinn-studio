import type { ReactElement } from 'react';
import { StudioContentMenu } from '@studio/components';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';
import { useCurrentSettingsTab } from '../../hooks/useCurrentSettingsTab';

export function ContentMenu(): ReactElement {
  const menuTabs = useAppSettingsMenuTabConfigs();
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

function extractTabIdsFromTabs(tabs: StudioContentMenuButtonTabProps<SettingsPageTabId>[]) {
  return tabs.map(({ tabId }) => tabId);
}
