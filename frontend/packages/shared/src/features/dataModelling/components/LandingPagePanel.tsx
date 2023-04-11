import React from 'react';
import classes from './LandingPagePanel.module.css';
import { Button, ButtonColor } from '@digdir/design-system-react';
import { XSDUpload } from './XSDUpload';
import { useTranslation } from 'react-i18next';
import { ButtonContainer } from 'app-shared/primitives';

export interface LandingPageProps {
  org: string;
  repo: string;
  handleXSDUploaded: (filename: string) => void;
  handleCreateModelClick: () => void;
}

export function LandingPagePanel({
  org,
  repo,
  handleXSDUploaded,
  handleCreateModelClick,
}: LandingPageProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.landingDialog}>
      <h1>{t('app_data_modelling.landing_dialog_header')}</h1>
      <p>{t('app_data_modelling.landing_dialog_paragraph')}</p>
      <ButtonContainer>
        <XSDUpload
          onXSDUploaded={(filename): void => handleXSDUploaded(filename)}
          org={org}
          repo={repo}
          submitButtonRenderer={(fileInputClickHandler) => (
            <Button color={ButtonColor.Primary} onClick={fileInputClickHandler}>
              {t('app_data_modelling.landing_dialog_upload')}
            </Button>
          )}
        />
        <Button color={ButtonColor.Secondary} onClick={(): void => handleCreateModelClick()}>
          {t('app_data_modelling.landing_dialog_create')}
        </Button>
      </ButtonContainer>
    </div>
  );
}
