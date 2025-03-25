import React, { type ReactElement } from 'react';
import { StudioPageHeader, useMediaQuery } from '@studio/components-legacy';
import { CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../../../contexts/SettingsModalContext';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';

export const SettingsModalButton = (): ReactElement => {
  const { t } = useTranslation();
  const { variant } = usePageHeaderContext();
  const { settingsRef } = useSettingsModalContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <>
      <StudioPageHeader.HeaderButton
        color='light'
        onClick={() => settingsRef.current.openSettings()}
        icon={<CogIcon />}
        variant={variant}
        aria-label={t('sync_header.settings')}
      >
        {shouldDisplayText && t('sync_header.settings')}
      </StudioPageHeader.HeaderButton>
      <SettingsModal ref={settingsRef} />
    </>
  );
};
