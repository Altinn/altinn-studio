import React, { useState } from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from "app-shared/providers/PreviewConnectionContext";
import { useInstanceIdQuery } from '../../hooks/queries/useInstanceIdQuery';
import AltinnStudioLogo from "app-shared/navigation/main-header/AltinnStudioLogo";
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

export const LandingPage = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const selectedLayoutInEditor = localStorage.getItem(instanceId);
  const selectedViewSize = localStorage.getItem('viewSize');
  const [viewSize, setViewSize] = useState<string>(selectedViewSize ?? 'desktop');

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

  const handleChangeViewSizeClick = () => {
    if (viewSize === 'desktop') {
      localStorage.setItem('viewSize', 'mobile');
      setViewSize('mobile');
    } else {
      localStorage.setItem('viewSize', 'desktop');
      setViewSize('desktop');
    }
  };

  return (
      <PreviewContext>
        <div className={classes.header}>
          <a href={`/editor/${org}/${app}/ui-editor?layout=${selectedLayoutInEditor}`}>
            <AltinnStudioLogo />
          </a>
          <div className={classes.betaTag}>
            {'BETA'}
          </div>
        </div>
        <div className={classes.subHeader}>
          <Button className={classes.desktopViewButton} style={viewSize === 'desktop' ? { color: 'black' } : {}} variant={viewSize === 'desktop' ? ButtonVariant.Filled : ButtonVariant.Outline} color={ButtonColor.Inverted} onClick={handleChangeViewSizeClick}>
            {t('preview.view_size_desktop')}
          </Button>
          <Button className={classes.mobileViewButton} style={viewSize === 'mobile' ? { color: 'black' } : {}} variant={viewSize === 'mobile' ? ButtonVariant.Filled : ButtonVariant.Outline} color={ButtonColor.Inverted} onClick={handleChangeViewSizeClick}>
            {t('preview.view_size_mobile')}
          </Button>
        </div>
        <div className={classes.iframeMobileViewContainer}>
          <iframe
            title={t('preview.iframe_title')}
            id='app-frontend-react-iframe'
            src={`/designer/html/preview.html?${stringify({ org, app })}`}
            className={viewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          ></iframe>
          {viewSize === 'mobile' && <div className={classes.iframeMobileViewOverlay}></div>}
        </div>
      </PreviewContext>
  );
};
