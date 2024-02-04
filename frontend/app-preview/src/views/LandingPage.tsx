import React from 'react';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useInstanceIdQuery, useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import { AltinnHeader } from 'app-shared/components/altinnHeader';
import type { AltinnHeaderVariant } from 'app-shared/components/altinnHeader/types';
import { getRepositoryType } from 'app-shared/utils/repository';
import { getTopBarAppPreviewMenu } from '../components/AppBarConfig/AppPreviewBarConfig';
import { appPreviewButtonActions } from '../components/AppBarConfig/AppPreviewBarConfig';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { previewPage } from 'app-shared/api/paths';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';

export interface LandingPageProps {
  variant?: AltinnHeaderVariant;
}

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = ({ variant = 'preview' }: LandingPageProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const { data: user } = useUserQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const [selectedLayoutSet, setSelectedLayoutSet] = useLocalStorage<string>(
    'layoutSet/' + app,
    null,
  );
  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>(
    'viewSize',
    'desktop',
  );

  const repoType = getRepositoryType(org, app);
  const menuItems: TopBarMenuItem[] = getTopBarAppPreviewMenu(org, app, repoType, t);
  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  const handleChangeLayoutSet = (layoutSet: string) => {
    setSelectedLayoutSet(layoutSet);
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
    <>
      <div className={classes.header}>
        <AltinnHeader
          menuItems={menuItems}
          showSubMenu={true}
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
              selectedLayoutSet={selectedLayoutSet}
              handleChangeLayoutSet={handleChangeLayoutSet}
            />
          }
        />
      </div>
      <div className={classes.previewArea}>
        <PreviewLimitationsInfo />
        <div className={classes.iframeContainer}>
          <iframe
            title={t('preview.iframe_title')}
            id='app-frontend-react-iframe'
            src={previewPage(org, app, selectedLayoutSet)}
            className={previewViewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          />
        </div>
      </div>
    </>
  );
};
