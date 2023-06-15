import React, { useState } from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { AltinnHeader } from 'app-shared/components/altinnHeader';
import { AltinnHeaderVariant } from 'app-shared/components/altinnHeader/types';
import { getRepositoryType } from 'app-shared/utils/repository';
import {
  getTopBarAppPreviewMenu,
  TopBarAppPreviewMenu,
} from '../components/AppBarConfig/AppPreviewBarConfig';
import { appPreviewButtonActions } from '../components/AppBarConfig/AppPreviewBarConfig';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';

export interface LandingPageProps {
  variant?: AltinnHeaderVariant;
}

export type ViewSize = 'desktop' | 'mobile';

const getLocalSelectedViewSize = (): ViewSize => {
  const localViewSize = localStorage.getItem('viewSize');
  if (localViewSize === 'mobile') {
    return 'mobile';
  }
  return 'desktop';
};

export const LandingPage = ({ variant = 'preview' }: LandingPageProps) => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const localSelectedViewSize: 'desktop' | 'mobile' = getLocalSelectedViewSize();
  const [viewSize, setViewSize] = useState<'desktop' | 'mobile'>(
    localSelectedViewSize ?? 'desktop'
  );
  const selectedLayoutSetInEditor = localStorage.getItem('layoutSetName');
  const { data: user } = useUserQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const repoType = getRepositoryType(org, app);
  const menu = getTopBarAppPreviewMenu(org, app, repoType, t);
  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  if (previewConnection) {
    previewConnection.on('ReceiveMessage', function (message) {
      const frame = document.getElementById('app-frontend-react-iframe');
      if (isIFrame(frame) && frame.contentWindow) {
        const targetOrigin = window.origin;
        // Trigger a reload of preview window until app-frontend implements re-calling api #https://github.com/Altinn/app-frontend-react/issues/1088
        window.location.reload();
        console.log('Sending reload message to app-frontend with targetOrigin: ' + targetOrigin);
        frame.contentWindow.postMessage({ action: message }, targetOrigin);
      }
    });
  }

  return (
    <PreviewContext>
      <>
        <div className={classes.header}>
          <AltinnHeader
            menu={menu}
            showSubMenu={true}
            activeMenuSelection={TopBarAppPreviewMenu.Preview}
            org={org}
            app={app}
            user={user}
            repository={repository}
            buttonActions={appPreviewButtonActions(org, app)}
            variant={variant}
            subMenuContent={<AppPreviewSubMenu setViewSize={setViewSize} viewSize={viewSize} />}
          />
        </div>
        <div className={classes.iframeMobileViewContainer}>
          <iframe
            title={t('preview.iframe_title')}
            id='app-frontend-react-iframe'
            src={`/designer/html/preview.html?${stringify({
              org,
              app,
              selectedLayoutSetInEditor,
            })}`}
            className={viewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          ></iframe>
          {viewSize === 'mobile' && <div className={classes.iframeMobileViewOverlay}></div>}
        </div>
      </>
    </PreviewContext>
  );
};
