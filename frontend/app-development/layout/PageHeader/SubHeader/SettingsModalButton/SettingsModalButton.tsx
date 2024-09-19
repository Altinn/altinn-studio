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
  const { settingsRef } = useSettingsModalContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <>
      <StudioPageHeaderButton
        color='light'
        onClick={() => settingsRef.current.openSettings()}
        icon={<CogIcon />}
        variant={variant}
        aria-label={t('sync_header.settings')}
      >
        {shouldDisplayText && t('sync_header.settings')}
      </StudioPageHeaderButton>
      <SettingsModal ref={settingsRef} />
    </>
  );
};
