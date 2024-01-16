import React from 'react';
import classes from './LandingPagePanel.module.css';
import { StudioButton } from '@studio/components';
import { XSDUpload } from './TopToolbar/XSDUpload';
import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';

export interface LandingPagePanelProps {
  openCreateNew: () => void;
}

export function LandingPagePanel({ openCreateNew }: LandingPagePanelProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.landingDialog}>
      <h1>{t('app_data_modelling.landing_dialog_header')}</h1>
      <p>{t('app_data_modelling.landing_dialog_paragraph')}</p>
      <ButtonContainer>
        <XSDUpload
          submitButtonRenderer={(fileInputClickHandler) => (
            <StudioButton color='first' onClick={fileInputClickHandler} size='small'>
              {t('app_data_modelling.landing_dialog_upload')}
            </StudioButton>
          )}
        />
        <StudioButton color='second' onClick={openCreateNew} size='small'>
          {t('app_data_modelling.landing_dialog_create')}
        </StudioButton>
      </ButtonContainer>
    </div>
  );
}
