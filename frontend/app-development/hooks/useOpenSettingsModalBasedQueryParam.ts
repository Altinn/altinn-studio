import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettingsModalContext } from '../contexts/SettingsModalContext';
import type { SettingsModalTabId } from '../types/SettingsModalTabId';
import { useSettingsModalMenuTabConfigs } from '../layout/PageHeader/SubHeader/SettingsModalButton/SettingsModal/hooks/useSettingsModalMenuTabConfigs';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export const openSettingsModalWithTabQueryKey: string = 'openSettingsModalWithTab';

export function useOpenSettingsModalBasedQueryParam(): void {
  const [searchParams] = useSearchParams();
  const { settingsRef } = useSettingsModalContext();
  const settingsModalTabs = useSettingsModalMenuTabConfigs();

  const tabIds = settingsModalTabs.map(({ tabId }) => tabId);

  useEffect((): void => {
    if (!shouldDisplayFeature(FeatureFlag.SettingsPage)) {
      const tabToOpen: SettingsModalTabId = searchParams.get(
        openSettingsModalWithTabQueryKey,
      ) as SettingsModalTabId;
      const shouldOpenModal: boolean = isValidTab(tabToOpen, tabIds);
      if (shouldOpenModal) {
        settingsRef.current.openSettings(tabToOpen);
      }
    }
  }, [searchParams, settingsRef, tabIds]);
}

function isValidTab(tabId: SettingsModalTabId, tabIds: Array<SettingsModalTabId>): boolean {
  return tabIds.includes(tabId);
}
