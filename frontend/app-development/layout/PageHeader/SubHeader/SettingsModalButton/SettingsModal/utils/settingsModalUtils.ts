import type { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import type { ReactNode } from 'react';

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
  currentTab: SettingsModalTab,
): LeftNavigationTab => {
  return {
    icon,
    tabName: `settings_modal.left_nav_tab_${tabId}`,
    tabId,
    action: {
      type: 'button',
      onClick,
    },
    isActiveTab: currentTab === tabId,
  };
};
