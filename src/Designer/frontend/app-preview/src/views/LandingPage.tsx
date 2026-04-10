import { useEffect } from 'react';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage } from '@studio/components-legacy/src/hooks/useLocalStorage';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewPage } from 'app-shared/api/paths';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { PreviewControlHeader } from '../components/PreviewControlHeader';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { StudioAlert, StudioPageSpinner } from '@studio/components';
import { useNavigate, useParams } from 'react-router-dom';
import { StudioPageLayout } from 'app-shared/components';

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useParams();
  const { t } = useTranslation();
  const previewConnection = usePreviewConnection();
  const { data: user, isPending: isPendingUser } = useUserQuery();
  const { data: layoutSets, isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);
  const { selectedFormLayoutName } = useSelectedFormLayoutName(layoutSet);
  const navigate = useNavigate();
  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>(
    'viewSize',
    'desktop',
  );
  const taskId = useSelectedTaskId(layoutSet);
  const {
    mutate: createInstance,
    data: instance,
    isPending: instanceIsPending,
  } = useCreatePreviewInstanceMutation(org, app);

  const currentLayoutSet = layoutSets?.sets?.find((set) => set.id === layoutSet);
  const isSubform = currentLayoutSet?.type === 'subform';

  useEffect(() => {
    if (user && taskId) createInstance({ partyId: user?.id, taskId: taskId });
  }, [createInstance, user, taskId]);

  const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
    input !== null && input.tagName === 'IFRAME';

  const handleChangeLayoutSet = (set: string) => {
    navigate(`/${org}/${app}/${set}`);
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
    getSelectedFormLayoutSetName(layoutSet),
    taskId,
    selectedFormLayoutName,
    instance?.id,
  );

  return (
    <StudioPageLayout
      currentAccountId={org}
      onSelectAccount={() => {}}
      fullScreen={true}
      hideBreadcrumbs={true}
    >
      <div className={classes.subHeader}>
        <AppPreviewSubMenu />
        {isSubform && (
          <StudioAlert data-color='warning'>
            {t('ux_editor.preview.subform_unsupported_warning')}
          </StudioAlert>
        )}
      </div>
      <div className={classes.previewArea}>
        <PreviewControlHeader
          setViewSize={setPreviewViewSize}
          viewSize={previewViewSize}
          selectedLayoutSet={layoutSet}
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
    </StudioPageLayout>
  );
};

const getSelectedFormLayoutSetName = (layoutSet: string): string | undefined => {
  if (layoutSet === '') return undefined;
  return layoutSet;
};
