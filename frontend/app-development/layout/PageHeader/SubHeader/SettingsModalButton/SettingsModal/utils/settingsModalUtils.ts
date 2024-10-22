import type { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import type { ReactNode } from 'react';

/**
 * Creates a new Navigation tab of the LeftNavigationTab type
 *
 * @param icon icon to display in the tab
 * @param tabName text representation of tab
 * @param tabId the id of the tab
 *
 * @returns a LeftNavigationTab
 */
export const createNavigationTab = (
  icon: ReactNode,
  tabName: string,
  tabId: SettingsModalTab,
): LeftNavigationTab => {
  return {
    icon,
    tabName,
    tabId,
  };
};
