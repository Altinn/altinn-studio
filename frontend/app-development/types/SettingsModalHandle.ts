import type { SettingsModalTabId } from './SettingsModalTabId';

export type SettingsModalHandle = {
  openSettings: (tab?: SettingsModalTabId) => void;
};
