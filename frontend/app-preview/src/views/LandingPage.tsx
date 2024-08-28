import React from 'react';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewPage } from 'app-shared/api/paths';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import {
  useSelectedFormLayoutName,
  useSelectedFormLayoutSetName,
  useSelectedTaskId,
} from '@altinn/ux-editor/hooks';
import { StudioPageHeader, type StudioProfileMenuItem, useMediaQuery } from '@studio/components';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { PreviewControlHeader } from '../components/PreviewControlHeader';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const previewConnection = usePreviewConnection();
  const { data: user } = useUserQuery();
  const { mutate: logout } = useLogoutMutation();
  const { data: repository } = useRepoMetadataQuery(org, app);
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

  const docsMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: altinnDocsUrl('') },
    itemName: t('sync_header.documentation'),
    hasDivider: true,
  };
  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };
  const profileMenuItems: StudioProfileMenuItem[] = [docsMenuItem, logOutMenuItem];

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
      <StudioPageHeader variant='preview'>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={shouldDisplayText && app} />
          <StudioPageHeader.Right>
            <AppUserProfileMenu
              user={user}
              repository={repository}
              color='light'
              profileMenuItems={profileMenuItems}
            />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
        <StudioPageHeader.Sub>
          <AppPreviewSubMenu />
        </StudioPageHeader.Sub>
      </StudioPageHeader>
      <div className={classes.previewArea}>
        <PreviewControlHeader
          setViewSize={setPreviewViewSize}
          viewSize={previewViewSize}
          selectedLayoutSet={selectedFormLayoutSetName}
          handleChangeLayoutSet={handleChangeLayoutSet}
        />
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
