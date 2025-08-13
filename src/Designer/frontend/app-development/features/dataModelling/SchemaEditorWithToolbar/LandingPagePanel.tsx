import React from 'react';
import classes from './LandingPagePanel.module.css';
import { StudioHeading } from '@studio/components-legacy';
import { StudioButton, StudioParagraph } from '@studio/components';
import { XSDUpload } from './TopToolbar/XSDUpload';
import { useTranslation } from 'react-i18next';

export interface LandingPagePanelProps {
  openCreateNew: () => void;
  canUseUploadXSDFeature: boolean;
}

export function LandingPagePanel({ openCreateNew, canUseUploadXSDFeature }: LandingPagePanelProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.landingDialog}>
      <StudioHeading size='small'>{t('app_data_modelling.landing_dialog_header')}</StudioHeading>
      <StudioParagraph data-size='md'>
        {t('app_data_modelling.landing_dialog_paragraph')}
      </StudioParagraph>
      <div className={classes.buttonWrapper}>
        {canUseUploadXSDFeature && (
          <XSDUpload
            uploadButtonText={t('app_data_modelling.landing_dialog_upload')}
            uploaderButtonVariant='primary'
          />
        )}
        <StudioButton variant='primary' onClick={openCreateNew}>
          {t('app_data_modelling.landing_dialog_create')}
        </StudioButton>
      </div>
    </div>
  );
}
