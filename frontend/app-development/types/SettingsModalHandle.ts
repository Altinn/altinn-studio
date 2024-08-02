import type { SettingsModalTab } from './SettingsModalTab';

export type SettingsModalHandle = {
  openSettings: (tab?: SettingsModalTab) => void;
};
