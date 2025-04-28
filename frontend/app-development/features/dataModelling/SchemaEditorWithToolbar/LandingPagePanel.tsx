import React from 'react';
import classes from './LandingPagePanel.module.css';
import { StudioButton, StudioHeading, StudioParagraph } from '@studio/components-legacy';
import { XSDUpload } from './TopToolbar/XSDUpload';
import { useTranslation } from 'react-i18next';

export interface LandingPagePanelProps {
  openCreateNew: () => void;
}

export function LandingPagePanel({ openCreateNew }: LandingPagePanelProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.landingDialog}>
      <StudioHeading size='small'>{t('app_data_modelling.landing_dialog_header')}</StudioHeading>
      <StudioParagraph>{t('app_data_modelling.landing_dialog_paragraph')}</StudioParagraph>
      <div className={classes.buttonWrapper}>
        <XSDUpload
          uploadButtonText={t('app_data_modelling.landing_dialog_upload')}
          uploaderButtonVariant='primary'
        />
        <StudioButton color='second' onClick={openCreateNew}>
          {t('app_data_modelling.landing_dialog_create')}
        </StudioButton>
      </div>
    </div>
  );
}
