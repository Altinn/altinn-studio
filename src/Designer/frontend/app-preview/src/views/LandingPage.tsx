import React, { useEffect } from 'react';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components-legacy/hooks/useLocalStorage';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewPage } from 'app-shared/api/paths';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import {
  StudioAlert,
  StudioPageHeader,
  StudioPageSpinner,
  useMediaQuery,
} from '@studio/components-legacy';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { PreviewControlHeader } from '../components/PreviewControlHeader';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useSelectedFormLayoutSetName } from 'app-shared/hooks/useSelectedFormLayoutSetName';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const previewConnection = usePreviewConnection();
  const { data: user, isPending: isPendingUser } = useUserQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { data: layoutSets, isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);
  const { selectedFormLayoutSetName, setSelectedFormLayoutSetName } =
    useSelectedFormLayoutSetName(layoutSets);
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);
  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>(
    'viewSize',
    'desktop',
  );
  const taskId = useSelectedTaskId(selectedFormLayoutSetName);
  const {
    mutate: createInstance,
    data: instance,
    isPending: instanceIsPending,
  } = useCreatePreviewInstanceMutation(org, app);

  const currentLayoutSet = layoutSets?.sets?.find((set) => set.id === selectedFormLayoutSetName);
  const isSubform = currentLayoutSet?.type === 'subform';

  useEffect(() => {
    if (user && taskId) createInstance({ partyId: user?.id, taskId: taskId });
  }, [createInstance, user, taskId]);

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

  if (isPendingUser || pendingLayoutsets || instanceIsPending)
    return <StudioPageSpinner spinnerTitle={t('preview.loading_page')} />;

  const previewUrl = previewPage(
    org,
    app,
    getSelectedFormLayoutSetName(selectedFormLayoutSetName),
    taskId,
    selectedFormLayoutName,
    instance?.id,
  );
  return (
    <>
      <StudioPageHeader variant='preview'>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={app} showTitle={shouldDisplayText} />
          <StudioPageHeader.Right>
            <UserProfileMenu user={user} repository={repository} />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
        <StudioPageHeader.Sub>
          <AppPreviewSubMenu />
          {isSubform && (
            <StudioAlert severity='warning'>
              {t('ux_editor.preview.subform_unsupported_warning')}
            </StudioAlert>
          )}
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
            src={previewUrl}
            className={previewViewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
          />
        </div>
      </div>
    </>
  );
};

const getSelectedFormLayoutSetName = (selectedFormLayoutSetName: string): string => {
  if (selectedFormLayoutSetName === '') return undefined;
  return selectedFormLayoutSetName;
};
