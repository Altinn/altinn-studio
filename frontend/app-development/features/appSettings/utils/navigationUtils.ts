import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { settingsPageQueryParamKey } from '../AppSettings';

export function getCurrentSettingsTab(): SettingsPageTabId {
  const searchParams = new URLSearchParams(window.location.search);
  return (searchParams.get(settingsPageQueryParamKey) as SettingsPageTabId) ?? 'about';
}

export function navigateToSettingsTab(tabId: SettingsPageTabId): void {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set(settingsPageQueryParamKey, tabId);
  window.history.pushState({}, '', `?${searchParams}`);
}

export function isValidSettingsTab(
  tabId: SettingsPageTabId,
  tabIds: Array<SettingsPageTabId>,
): boolean {
  return tabIds.includes(tabId);
}
