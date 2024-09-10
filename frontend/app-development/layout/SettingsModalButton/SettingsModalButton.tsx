import type { ReactNode } from 'react';
import React from 'react';
import { StudioButton } from '@studio/components';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../contexts/SettingsModalContext';

export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();
  const { settingsRef } = useSettingsModalContext();

  return (
    <>
      <StudioButton
        color='inverted'
        icon={<CogIcon />}
        onClick={() => settingsRef.current.openSettings()}
        variant='tertiary'
      >
        {t('sync_header.settings')}
      </StudioButton>
      <SettingsModal ref={settingsRef} />
    </>
  );
};
