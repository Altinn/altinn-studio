import React from 'react';
import type { ReactElement } from 'react';
import { StudioDialog, StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './NavigationWarningDialog.module.css';

export function NavigationWarningDialog(): ReactElement {
  const { t } = useTranslation();

  return (
    <StudioDialog open={blocker.state === 'blocked'}>
      <StudioDialog.Block>
        <StudioHeading level={2}>{t('app_settings.about_tab_navigation_header')}</StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <StudioParagraph>{t('')}</StudioParagraph>
        <StudioButton
          variant='primary'
          onClick={() => {
            blocker.proceed();
          }}
        >
          {t('')}
        </StudioButton>
        <StudioButton
          variant='primary'
          onClick={() => {
            blocker.reset();
          }}
        >
          {t('')}
        </StudioButton>
      </StudioDialog.Block>
    </StudioDialog>
  );
}
