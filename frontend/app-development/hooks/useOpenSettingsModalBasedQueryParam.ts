import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettingsModalContext } from '../contexts/SettingsModalContext';
import type { SettingsModalTabId } from '../types/SettingsModalTabId';
import { allSettingsModalTabs } from '../layout/PageHeader/SubHeader/SettingsModalButton/SettingsModal/hooks/useSettingsModalMenuTabConfigs';

export const queryParamKey: string = 'openSettingsModalWithTab';

export function useOpenSettingsModalBasedQueryParam(): void {
  const [searchParams] = useSearchParams();
  const { settingsRef } = useSettingsModalContext();

  useEffect((): void => {
    const tabToOpen: SettingsModalTabId = searchParams.get(queryParamKey) as SettingsModalTabId;
    const shouldOpenModal: boolean = isValidTab(tabToOpen);
    if (shouldOpenModal) {
      settingsRef.current.openSettings(tabToOpen);
    }
<<<<<<< HEAD
  }, [searchParams, settingsRef]);
=======
  }, [searchParams]);
>>>>>>> 41381f181 (feat(settings): make it possible to open settings modal based on query-params)
}

function isValidTab(tabId: SettingsModalTabId): boolean {
  return allSettingsModalTabs.includes(tabId);
}
