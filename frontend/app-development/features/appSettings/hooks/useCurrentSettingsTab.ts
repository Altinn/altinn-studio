import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { settingsPageQueryParamKey } from '../utils';

const DEFAULT_TAB: SettingsPageTabId = 'about';

export function useCurrentSettingsTab(validTabIds?: SettingsPageTabId[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab: SettingsPageTabId = useMemo(() => {
    const tab: SettingsPageTabId = searchParams.get(
      settingsPageQueryParamKey,
    ) as SettingsPageTabId | null;
    if (validTabIds && !isValidSettingsTab(tab, validTabIds)) {
      return DEFAULT_TAB;
    }
    return tab ?? DEFAULT_TAB;
  }, [searchParams, validTabIds]);

  const setCurrentTab = (tabId: SettingsPageTabId): void => {
    const isValid: boolean = validTabIds ? isValidSettingsTab(tabId, validTabIds) : true;
    const finalTab: SettingsPageTabId = isValid ? tabId : DEFAULT_TAB;

    const newParams: URLSearchParams = new URLSearchParams(searchParams);
    newParams.set(settingsPageQueryParamKey, finalTab);
    setSearchParams(newParams);
  };

  return {
    currentTab,
    setCurrentTab,
  };
}

export function isValidSettingsTab(
  tabId: SettingsPageTabId,
  tabIds: Array<SettingsPageTabId>,
): boolean {
  return tabIds.includes(tabId);
}
