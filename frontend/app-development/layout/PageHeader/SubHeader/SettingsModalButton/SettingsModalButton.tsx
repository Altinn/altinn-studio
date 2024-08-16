import type { ReactNode } from 'react';
import React from 'react';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../../../contexts/SettingsModalContext';
import { WINDOW_RESIZE_WIDTH } from 'app-shared/utils/resizeUtils';

export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();
  const shouldResizeWindow = useMediaQuery(`(max-width: ${WINDOW_RESIZE_WIDTH}px)`);

  const { settingsModalOpen, setSettingsModalOpen, settingsModalSelectedTab } =
    useSettingsModalContext();

  return (
    <>
      <StudioPageHeaderButton
        color='light'
        onClick={() => setSettingsModalOpen(true)}
        icon={<CogIcon />}
      >
        {!shouldResizeWindow && t('sync_header.settings')}
      </StudioPageHeaderButton>
      {
        // Done to prevent API calls to be executed before the modal is open
        settingsModalOpen && (
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            defaultTab={settingsModalSelectedTab}
          />
        )
      }
    </>
  );
};
