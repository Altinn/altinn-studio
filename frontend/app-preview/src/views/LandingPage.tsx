import React, { useState } from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useUserQuery } from 'app-shared/hooks/queries';
import { Button, ToggleButtonGroup } from '@digdir/design-system-react';
import { ButtonVariant } from '@altinn/altinn-design-system';
import { LinkIcon, ArrowCirclepathIcon, EyeIcon } from '@navikt/aksel-icons';
import { AltinnHeader } from 'app-shared/components/altinnHeader';
import { buttonActions, subMenuContent } from 'app-development/layout/PageHeader';
import { AltinnHeaderVariant } from 'app-shared/components/altinnHeader/types';
import { IRepository } from 'app-shared/types/global';

export interface LandingPageProps {
  showSubMenu: boolean;
  variant?: AltinnHeaderVariant;
  repository?: IRepository;
  subMenuContent?: JSX.Element;
}

export const LandingPage = ({ showSubMenu, variant = 'preview', repository }: LandingPageProps) => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const localSelectedViewSize = localStorage.getItem('viewSize');
  const [viewSize, setViewSize] = useState<string>(localSelectedViewSize ?? 'desktop');
  const selectedLayoutSetInEditor = localStorage.getItem('layoutSetName');
  const { data: user } = useUserQuery();
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

  const handleChangeViewSizeClick = (selectedViewSize: string) => {
    localStorage.setItem('viewSize', selectedViewSize);
    setViewSize(selectedViewSize);
  };

  return (
    <PreviewContext>
      <>
        <div className={classes.header}>
          <AltinnHeader
            menu={undefined}
            showSubMenu={showSubMenu}
            subMenuContent={subMenuContent()}
            activeMenuSelection={undefined}
            org={org}
            app={app}
            user={user}
            repository={repository}
            buttonActions={buttonActions(org, app)}
            variant={variant}
          />
        </div>
        <div className={classes.subHeader}>
          <span className={classes.viewSizeButtons}>
            <ToggleButtonGroup
              items={[
                {
                  label: t('preview.view_size_desktop'),
                  value: 'desktop',
                },
                {
                  label: t('preview.view_size_mobile'),
                  value: 'mobile',
                },
              ]}
              onChange={handleChangeViewSizeClick}
              selectedValue={viewSize === 'desktop' ? 'desktop' : 'mobile'}
            />
          </span>
          <div className={classes.leftSubHeaderButtons}>
            <Button icon={<ArrowCirclepathIcon />} variant={ButtonVariant.Quiet}>
              {t('preview.subheader.restart.button')}
            </Button>
            <Button icon={<EyeIcon />} variant={ButtonVariant.Quiet}>
              {t('preview.subheader.showas.button')}
            </Button>
            <Button icon={<LinkIcon />} variant={ButtonVariant.Quiet}>
              {t('preview.subheader.sharelink.button')}
            </Button>
          </div>
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
