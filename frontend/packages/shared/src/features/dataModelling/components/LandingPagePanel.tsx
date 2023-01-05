import React from 'react';
import { AltinnButton } from '../../../components';
import { getLanguageFromKey } from '../../../utils/language';
import { XSDUpload } from './XSDUpload';
import classes from './LandingPagePanel.module.css';

export interface LandingPageProps {
  language: any;
  org: string;
  repo: string;
  handleXSDUploaded: (filename: string) => void;
  handleCreateModelClick: () => void;
  closeLandingPage: () => void;
}

export function LandingPagePanel({
  language,
  org,
  repo,
  closeLandingPage,
  handleXSDUploaded,
  handleCreateModelClick,
}: LandingPageProps) {
  const t = (key: string) => getLanguageFromKey(key, language);

  return (
    <div className={classes.landingDialog}>
      <h1>{t('app_data_modelling.landing_dialog_header')}</h1>
      <p>{t('app_data_modelling.landing_dialog_paragraph')}</p>
      <div className={classes.buttons}>
        <XSDUpload
          language={language}
          onXSDUploaded={(filename) => {
            handleXSDUploaded(filename);
            closeLandingPage();
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
          onClickFunction={() => {
            handleCreateModelClick();
            closeLandingPage();
          }}
        />
      </div>
    </div>
  );
}
