import React from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';

export const LandingPage = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();

  return (
    <PreviewContext>
      <div className={classes.header}>
        <h1>Altinn Studio - App Preview</h1>
      </div>
      <iframe
        title={t('preview.iframe_title')}
        id='app-frontend-react-iframe'
        src={`/designer/html/preview.html?${stringify({ org, app })}`}
        className={classes.iframe}
      ></iframe>
    </PreviewContext>
  );
};
