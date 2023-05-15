import React from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from "app-shared/providers/PreviewConnectionContext";
import AltinnStudioLogo from "app-shared/navigation/main-header/AltinnStudioLogo";

export const LandingPage = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();

  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  if (previewConnection) {
    previewConnection.on("ReceiveMessage", function (message) {
      const frame = document.getElementById('app-frontend-react-iframe');
      if (isIFrame(frame) && frame.contentWindow) {
        const targetOrigin = window.origin;
        // Trigger a reload of preview window until app-frontend implements re-calling api #https://github.com/Altinn/app-frontend-react/issues/1088
        window.location.reload();
        console.log("Sending reload message to app-frontend with targetOrigin: " + targetOrigin);
        frame.contentWindow.postMessage({ action: message }, targetOrigin);
      }
    })
  }

  return (
    <PreviewContext>
      <div className={classes.header}>
        <a href='/'>
          <AltinnStudioLogo />
        </a>
        <div className={classes.betaTag}>
          {'BETA'}
        </div>
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
