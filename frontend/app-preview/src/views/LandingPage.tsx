import React from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';

export const LandingPage = () => {
  const { org, app } = useParams();

  return (
    <PreviewContext>
      <div className={classes.header}>
        <h1>Altinn Studio - App Preview</h1>
      </div>
      <iframe
        title='App in preview'
        id='app-frontend-react-iframe'
        src={`/designer/html/preview.html?${stringify({ org, app })}`}
        className={classes.iframe}
      ></iframe>
    </PreviewContext>
  );
};
