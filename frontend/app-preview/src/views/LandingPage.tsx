import React, { useState } from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useInstanceIdQuery, useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import { AltinnHeader } from 'app-shared/components/altinnHeader';
import { AltinnHeaderVariant } from 'app-shared/components/altinnHeader/types';
import { getRepositoryType } from 'app-shared/utils/repository';
import {
  getTopBarAppPreviewMenu,
  TopBarAppPreviewMenu,
} from '../components/AppBarConfig/AppPreviewBarConfig';
import { appPreviewButtonActions } from '../components/AppBarConfig/AppPreviewBarConfig';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { Alert, Button, LegacyPopover } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { previewPage } from 'app-shared/api/paths';
import { typedSessionStorage } from 'app-shared/utils/webStorage';

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
  const repoType = getRepositoryType(org, app);
  const menu = getTopBarAppPreviewMenu(org, app, repoType, t);
  const [openSaveChoiceInSession, setOpenShowSaveChoiceInSession] = useState<boolean>(false);
  const showPreviewLimitationsInfoSession: boolean = typedSessionStorage.getItem('showPreviewLimitationsInfo');
  const [showPreviewLimitationsInfo, setShowPreviewLimitationsInfo] = useState<boolean>(showPreviewLimitationsInfoSession ?? true);
  const [selectedLayoutSetInEditor, setSelectedLayoutSetInEditor] = useLocalStorage<string>(
    'layoutSet/' + app,
  );
  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>(
    'viewSize',
    'desktop',
  );
  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';
  if (showPreviewLimitationsInfo) {
    const previewLimitationsInfo = document.getElementById('preview-limitations-info');
    const dynamicHeight = previewLimitationsInfo?.scrollHeight ?? 0;
    document.documentElement.style.setProperty('--previewLimitationsInfo-height', `${dynamicHeight}px`);
  }
  
  const handleChangeLayoutSet = (layoutSet: string) => {
    setSelectedLayoutSetInEditor(layoutSet);
    // might need to remove selected layout from local storage to make sure first page is selected
    window.location.reload();
  };

  const handleHidePreviewLimitations = () => {
    setShowPreviewLimitationsInfo(false);
    setOpenShowSaveChoiceInSession(false);
    document.documentElement.style.setProperty('--previewLimitationsInfo-height', '0px');
  };

  const handleRememberChoiceForSession = () => {
    typedSessionStorage.setItem('showPreviewLimitationsInfo', false);
    handleHidePreviewLimitations();
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
        {showPreviewLimitationsInfo &&
          <Alert severity='info' className={classes.previewLimitationsInfo} id='preview-limitations-info'>
            <div className={classes.alert}>
              {t('preview.limitations_info')}
              <LegacyPopover
                  trigger={<Button onClick={() => setOpenShowSaveChoiceInSession(!openSaveChoiceInSession)} size='small' variant='tertiary' icon={<XMarkIcon />}/>}
                  open={openSaveChoiceInSession}
              >
                {t('session.reminder')}
                <span className={classes.row}>
                  <Button onClick={handleHidePreviewLimitations} size='small' variant='secondary'>{t('session.do_show_again')}</Button>
                  <Button onClick={handleRememberChoiceForSession} size='small' variant='secondary'>{t('session.dont_show_again')}</Button>
                </span>
              </LegacyPopover>
            </div>
          </Alert>}
        <div className={classes.iframeContainer}>
          <iframe
            title={t('preview.iframe_title')}
            id='app-frontend-react-iframe'
            src={previewPage(org, app, selectedLayoutSetInEditor)}
            className={previewViewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          />
        </div>
      </>
    </PreviewContext>
  );
};
