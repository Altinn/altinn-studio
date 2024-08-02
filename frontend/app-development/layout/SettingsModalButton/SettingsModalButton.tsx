import type { ReactNode } from 'react';
import React from 'react';
import { StudioModal } from '@studio/components';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../contexts/SettingsModalContext';

export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();
  const { settingsRef } = useSettingsModalContext();

  return (
    <StudioModal.Root>
      <StudioModal.Trigger variant='tertiary' color='inverted' icon={<CogIcon />}>
        {t('sync_header.settings')}
      </StudioModal.Trigger>
      <SettingsModal ref={settingsRef} />
    </StudioModal.Root>
  );
};
