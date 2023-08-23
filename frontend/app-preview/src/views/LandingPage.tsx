import React from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useInstanceIdQuery, useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from 'app-shared/hooks/useWebStorage';
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

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = ({ variant = 'preview' }: LandingPageProps) => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const { data: user } = useUserQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const repoType = getRepositoryType(org, app);
  const menu = getTopBarAppPreviewMenu(org, app, repoType, t);
  const [selectedLayoutSetInEditor, setSelectedLayoutSetInEditor] = useLocalStorage<string>(
    'layoutSet' + app
  );

  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>('viewSize', 'desktop');

  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  const handleChangeLayoutSet = (layoutSet: string) => {
    setSelectedLayoutSetInEditor(layoutSet);
    // might need to remove selected layout from local storage to make sure first page is selected
    window.location.reload();
  };

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
            buttonActions={appPreviewButtonActions(org, app, instanceId)}
            variant={variant}
            subMenuContent={
              <AppPreviewSubMenu
                setViewSize={setPreviewViewSize}
                viewSize={previewViewSize}
                selectedLayoutSet={selectedLayoutSetInEditor}
                handleChangeLayoutSet={handleChangeLayoutSet}
              />
            }
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
            className={previewViewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          ></iframe>
          {previewViewSize === 'mobile' && <div className={classes.iframeMobileViewOverlay}></div>}
        </div>
      </>
    </PreviewContext>
  );
};
