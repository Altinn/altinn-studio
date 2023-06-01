import React, { useState } from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from "app-shared/providers/PreviewConnectionContext";
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import AltinnStudioLogo from "app-shared/navigation/main-header/AltinnStudioLogo";
import { ToggleButtonGroup } from '@digdir/design-system-react';

export const LandingPage = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const selectedLayoutInEditor = localStorage.getItem(instanceId);
  const localSelectedViewSize = localStorage.getItem('viewSize');
  const [viewSize, setViewSize] = useState<string>(localSelectedViewSize ?? 'desktop');
  const selectedLayoutSetInEditor = localStorage.getItem('layoutSetName');


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

  const handleChangeViewSizeClick = (selectedViewSize: string) => {
      localStorage.setItem('viewSize', selectedViewSize);
      setViewSize(selectedViewSize);
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
          <span className={classes.viewSizeButtons}>
          <ToggleButtonGroup
            items={[
              {
                label: t('preview.view_size_desktop'),
                value: 'desktop'
              },
              {
                label: t('preview.view_size_mobile'),
                value: 'mobile'
              }
            ]}
            onChange={handleChangeViewSizeClick}
            selectedValue={viewSize === 'Desktop' ? 'desktop' : 'mobile'}/>
            </span>
        </div>
        <div className={classes.iframeMobileViewContainer}>
          <iframe
            title={t('preview.iframe_title')}
            id='app-frontend-react-iframe'
            src={`/designer/html/preview.html?${stringify({ org, app, selectedLayoutSetInEditor })}`}
            className={viewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          ></iframe>
          {viewSize === 'mobile' && <div className={classes.iframeMobileViewOverlay}></div>}
        </div>
      </PreviewContext>
  );
};
