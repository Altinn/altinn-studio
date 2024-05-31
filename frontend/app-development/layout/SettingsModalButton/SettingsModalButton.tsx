import type { ReactNode } from 'react';
import React from 'react';
import { StudioButton } from '@studio/components';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../contexts/SettingsModalContext';

export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();
  const { settingsModalOpen, setSettingsModalOpen, settingsModalSelectedTab } =
    useSettingsModalContext();

  return (
    <>
      <StudioButton
        onClick={() => setSettingsModalOpen(true)}
        size='small'
        variant='tertiary'
        color='inverted'
        icon={<CogIcon />}
      >
        {t('sync_header.settings')}
      </StudioButton>
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
