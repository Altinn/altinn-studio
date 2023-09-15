import { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { ReactNode } from 'react';

/**
 * Function that gets if a tab is active or not
 *
 * @param currentTab the currently selected tab
 * @param tabId the id of the tab to check
 *
 * @returns boolean for if it is active or not
 */
export const getIsActiveTab = (currentTab: SettingsModalTab, tabId: SettingsModalTab) => {
  return currentTab === tabId;
};

/**
 * Creates a new Navigation tab of the LeftNavigationTab type
 *
 * @param icon icon to display in the tab
 * @param tabId the id of the tab
 * @param onClick function to execute on click of the tab
 * @param currentTab the current tab
 *
 * @returns a LeftNavigationTab
 */
export const createNavigationTab = (
  icon: ReactNode,
  tabId: SettingsModalTab,
  onClick: () => void,
  currentTab: SettingsModalTab
): LeftNavigationTab => {
  return {
    icon,
    tabName: `settings_modal.left_nav_tab_${tabId}`,
    tabId,
    action: {
      type: 'button',
      onClick,
    },
    isActiveTab: getIsActiveTab(currentTab, tabId),
  };
};
