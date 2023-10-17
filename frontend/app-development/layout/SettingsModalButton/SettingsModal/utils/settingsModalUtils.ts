import { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { ReactNode } from 'react';

/**
 * Creates a new Navigation tab of the LeftNavigationTab type
 *
 * @param icon icon to display in the tab
 * @param tabId the id of the tab
 * @param onClick function to execute on click of the tab
 * @param currentTab the current tab
 * @param handleKeyPress function to be executed on key press
 *
 * @returns a LeftNavigationTab
 */
export const createNavigationTab = (
  icon: ReactNode,
  tabId: SettingsModalTab,
  onClick: () => void,
  currentTab: SettingsModalTab,
  handleKeyPress: (e: React.KeyboardEvent<HTMLButtonElement>) => void,
): LeftNavigationTab => {
  return {
    icon,
    tabName: `settings_modal.left_nav_tab_${tabId}`,
    tabId,
    action: {
      type: 'button',
      onClick,
      onKeyDown: handleKeyPress,
    },
    isActiveTab: currentTab === tabId,
  };
};
