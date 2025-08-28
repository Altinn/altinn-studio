import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { settingsPageQueryParamKey } from '../utils';

const DEFAULT_TAB: SettingsPageTabId = 'about';

export function useCurrentSettingsTab(validTabIds?: SettingsPageTabId[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTabFromQuery = searchParams.get(
    settingsPageQueryParamKey,
  ) as SettingsPageTabId | null;

  const tabToDisplay: SettingsPageTabId = useMemo(() => {
    if (!isValidSettingsTab(requestedTabFromQuery, validTabIds)) {
      return DEFAULT_TAB;
    }
    return requestedTabFromQuery;
  }, [requestedTabFromQuery, validTabIds]);

  const setTabToDisplay = (tabId: SettingsPageTabId): void => {
    const isValid: boolean = isValidSettingsTab(tabId, validTabIds);
    const finalTab: SettingsPageTabId = isValid ? tabId : DEFAULT_TAB;

    const newParams: URLSearchParams = new URLSearchParams(searchParams);
    newParams.set(settingsPageQueryParamKey, finalTab);
    setSearchParams(newParams);
  };

  return {
    tabToDisplay,
    setTabToDisplay,
  };
}

function isValidSettingsTab(tabId: SettingsPageTabId, tabIds?: SettingsPageTabId[]): boolean {
  if (!tabIds) return true;
  return isTabIdInTabsList(tabId, tabIds);
}

function isTabIdInTabsList(tabId: SettingsPageTabId, tabIds: SettingsPageTabId[]): boolean {
  return tabIds?.includes(tabId);
}
