import React from 'react';
import { AltinnButton } from '../../../components';
import { XSDUpload } from './XSDUpload';
import classes from './LandingPagePanel.module.css';
import { useTranslation } from 'react-i18next';

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
      <div className={classes.buttons}>
        <XSDUpload
          onXSDUploaded={(filename): void => {
            handleXSDUploaded(filename);
          }}
          org={org}
          repo={repo}
          submitButtonRenderer={(fileInputClickHandler) => (
            <AltinnButton
              onClickFunction={fileInputClickHandler}
              btnText={t('app_data_modelling.landing_dialog_upload')}
            />
          )}
        />
        <AltinnButton
          btnText={t('app_data_modelling.landing_dialog_create')}
          secondaryButton
          onClickFunction={(): void => {
            handleCreateModelClick();
          }}
        />
      </div>
    </div>
  );
}
