import type { ReactNode } from 'react';
import React from 'react';
import { StudioPageHeaderButton, useIsSmallWidth } from '@studio/components';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../contexts/SettingsModalContext';

// TODO MOVE
const SMALL_WIDTH = 900;

export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();
  const isSmallWidth = useIsSmallWidth(SMALL_WIDTH);
  const { settingsModalOpen, setSettingsModalOpen, settingsModalSelectedTab } =
    useSettingsModalContext();

  return (
    <>
      <StudioPageHeaderButton
        onClick={() => setSettingsModalOpen(true)}
        variant='regular'
        color='light'
        icon={<CogIcon />}
      >
        {!isSmallWidth && t('sync_header.settings')}
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
