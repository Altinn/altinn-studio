import React from 'react';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useInstanceIdQuery, useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import type { AltinnHeaderVariant } from 'app-shared/components/altinnHeader/types';
import { appPreviewButtonActions } from '../components/AppBarConfig/AppPreviewBarConfig';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewPage } from 'app-shared/api/paths';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import {
  useSelectedFormLayoutName,
  useSelectedFormLayoutSetName,
  useSelectedTaskId,
} from '@altinn/ux-editor/hooks';
import { StudioPageHeader } from '@studio/components';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { AltinnHeaderMenu } from 'app-shared/components/altinnHeaderMenu';

// TODO MOVE
const WINDOW_RESIZE_WIDTH = 1000;

export interface LandingPageProps {
  variant?: AltinnHeaderVariant;
}

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = ({ variant = 'preview' }: LandingPageProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const { data: user } = useUserQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const { selectedFormLayoutSetName, setSelectedFormLayoutSetName } =
    useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);
  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>(
    'viewSize',
    'desktop',
  );
  const taskId = useSelectedTaskId(selectedFormLayoutSetName);
  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  const handleChangeLayoutSet = (layoutSet: string) => {
    setSelectedFormLayoutSetName(layoutSet);
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

  // TODO - WHY NOT CORRECT FONT FAMILY
  return (
    <>
      <StudioPageHeader>
        <StudioPageHeader.Main variant='preview'>
          <StudioPageHeader.Left title={app} />
          <StudioPageHeader.Center>
            <AltinnHeaderMenu
              menuItems={[]}
              windowResizeWidth={WINDOW_RESIZE_WIDTH}
              deploymentItems={appPreviewButtonActions(org, app, instanceId)}
            />
          </StudioPageHeader.Center>
          <StudioPageHeader.Right>
            <AppUserProfileMenu user={user} repository={repository} />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
        <StudioPageHeader.Sub>
          <AppPreviewSubMenu
            setViewSize={setPreviewViewSize}
            viewSize={previewViewSize}
            selectedLayoutSet={selectedFormLayoutSetName}
            handleChangeLayoutSet={handleChangeLayoutSet}
          />
        </StudioPageHeader.Sub>
      </StudioPageHeader>
      {/* TODO - MOVE TO SEPARATE FILE */}
      <div className={classes.previewArea}>
        <PreviewLimitationsInfo />
        <div className={classes.iframeContainer}>
          <iframe
            title={t('preview.title')}
            id='app-frontend-react-iframe'
            src={previewPage(org, app, selectedFormLayoutSetName, taskId, selectedFormLayoutName)}
            className={previewViewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          />
        </div>
      </div>
    </>
  );
};
