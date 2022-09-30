import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AltinnButton } from 'app-shared/components';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { XSDUpload } from './XSDUpload';

const useStyles = makeStyles({
  landingDialog: {
    backgroundColor: '#E3F7FF',
    borderRadius: 0,
    boxShadow: '1px 1px 3px 2px rgb(0 0 0 / 25%)',
    height: 229,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: 36,
    padding: '3rem',
    paddingLeft: 96,
    width: 783,
    '& h1': {
      fontSize: 18,
      fontWeight: 'bold',
    },
  },
  background: {
    backgroundColor: '#F7F7F7',
  },
  buttons: {
    display: 'flex',
    '& > :first-child button': {
      marginRight: '2rem',
      overflow: 'hidden', // Without this, the :before symbol makes the focus outline look weird
      '&:before': {
        content: '"\\f02f"',
        fontFamily: 'AltinnStudio',
        fontSize: '4rem',
        marginRight: '1rem',
      },
    },
    '& > :last-child': {
      backgroundColor: '#FFF',
      border: '2px solid #50ABDD',
      color: '#50ABDD',
      transition: 'none',
      '& .MuiButton-label span': {
        borderBottomWidth: 0,
      },
      '&:hover': {
        borderColor: '#0062BA',
        color: '#0062BA',
      },
    },
  },
});

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
  const classes = useStyles();
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
