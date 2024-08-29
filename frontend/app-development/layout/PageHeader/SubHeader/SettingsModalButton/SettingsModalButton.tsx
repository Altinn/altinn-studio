import type { ReactNode } from 'react';
import React from 'react';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../../../contexts/SettingsModalContext';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';

export const SettingsModalButton = (): ReactNode => {
  const { t } = useTranslation();
  const { variant } = usePageHeaderContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  const { settingsModalOpen, setSettingsModalOpen, settingsModalSelectedTab } =
    useSettingsModalContext();

  return (
    <>
      <StudioPageHeaderButton
        color='light'
        onClick={() => setSettingsModalOpen(true)}
        icon={<CogIcon />}
        variant={variant}
      >
        {shouldDisplayText && t('sync_header.settings')}
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
