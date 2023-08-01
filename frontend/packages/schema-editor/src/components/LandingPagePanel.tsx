import React, { MutableRefObject } from 'react';
import classes from './LandingPagePanel.module.css';
import { Button, ButtonColor } from '@digdir/design-system-react';
import { XSDUpload } from './TopToolbar/XSDUpload';
import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';

export interface LandingPagePanelProps {
  openCreateNew: () => void;
  uploadedOrCreatedFileName: MutableRefObject<string | null>;
}

export function LandingPagePanel({ openCreateNew, uploadedOrCreatedFileName }: LandingPagePanelProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.landingDialog}>
      <h1>{t('app_data_modelling.landing_dialog_header')}</h1>
      <p>{t('app_data_modelling.landing_dialog_paragraph')}</p>
      <ButtonContainer>
        <XSDUpload
          submitButtonRenderer={(fileInputClickHandler) => (
            <Button color={ButtonColor.Primary} onClick={fileInputClickHandler}>
              {t('app_data_modelling.landing_dialog_upload')}
            </Button>
          )}
          uploadedOrCreatedFileName={uploadedOrCreatedFileName}
        />
        <Button color={ButtonColor.Secondary} onClick={openCreateNew}>
          {t('app_data_modelling.landing_dialog_create')}
        </Button>
      </ButtonContainer>
    </div>
  );
}
