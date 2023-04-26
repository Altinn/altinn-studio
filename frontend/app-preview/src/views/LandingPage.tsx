import React from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import * as signalR from "@microsoft/signalr";

export const LandingPage = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();

  const connection = new signalR.HubConnectionBuilder().withUrl("/previewHub").configureLogging(signalR.LogLevel.Information).build();
  connection.start();

  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  connection.on("ReceiveMessage", function (message) {
    console.log("SignalR message received: " + message);
    let frame = document.getElementById('app-frontend-react-iframe');
    if (isIFrame(frame) && frame.contentWindow){
      const targetOrigin = window.origin;
      console.log("Sending reload message to app-frontend with targetOrigin: " + targetOrigin);
      frame.contentWindow.postMessage({ action: message }, targetOrigin);
    }
  });

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
