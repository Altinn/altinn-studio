import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import { useAppVersionQuery, useRepoMetadataQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useLocalStorage, useMediaQuery } from '@designer/hooks';
import { AppPreviewSubMenu } from '../components/AppPreviewSubMenu';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewSessionPage } from 'app-shared/api/paths';
import { PreviewLimitationsInfo } from 'app-shared/components/PreviewLimitationsInfo/PreviewLimitationsInfo';
import { PreviewDisabledInfo } from 'app-shared/components/PreviewDisabledInfo/PreviewDisabledInfo';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { PreviewControlHeader } from '../components/PreviewControlHeader';
import { MEDIA_QUERY_MAX_WIDTH, NEXT_V9_VERSION } from 'app-shared/constants';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useSelectedTaskId } from 'app-shared/hooks/useSelectedTaskId';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { usePreviewSessionQuery } from 'app-shared/hooks/queries/usePreviewSessionQuery';
import { usePreviewSessionInstanceQuery } from 'app-shared/hooks/queries/usePreviewSessionInstanceQuery';
import {
  StudioAlert,
  StudioCenter,
  StudioPageHeader,
  StudioPageSpinner,
  StudioSpinner,
  StudioValidationMessage,
} from '@designer/components';
import { useNavigate, useParams } from 'react-router-dom';

export type PreviewAsViewSize = 'desktop' | 'mobile';

export const LandingPage = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useParams();
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { data: user, isPending: isPendingUser } = useUserQuery();
  const { data: version, isPending: isPendingVersion } = useAppVersionQuery(org, app);
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { data: layoutSets, isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);
  const { selectedFormLayoutName } = useSelectedFormLayoutName(layoutSet);
  const navigate = useNavigate();
  const [previewViewSize, setPreviewViewSize] = useLocalStorage<PreviewAsViewSize>(
    'viewSize',
    'desktop',
  );
  const taskId = useSelectedTaskId(layoutSet);

  const currentLayoutSet = layoutSets?.find((set) => set.id === layoutSet);
  const isSubform = currentLayoutSet?.type === 'subform';
  // The preview service shows v9 apps. Older apps keep the notice that preview is turned off.
  const isV9 = !!version && !isBelowSupportedVersion(version.frontendVersion, NEXT_V9_VERSION);

  const handleChangeLayoutSet = (set: string) => {
    navigate(`/${org}/${app}/${set}`);
  };

  if (isPendingUser || pendingLayoutsets || isPendingVersion)
    return <StudioPageSpinner spinnerTitle={t('preview.loading_page')} />;

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
            <StudioAlert data-color='warning'>
              {t('ux_editor.preview.subform_unsupported_warning')}
            </StudioAlert>
          )}
        </StudioPageHeader.Sub>
      </StudioPageHeader>
      <div className={classes.previewArea}>
        {isV9 ? (
          <>
            <PreviewControlHeader
              setViewSize={setPreviewViewSize}
              viewSize={previewViewSize}
              selectedLayoutSet={layoutSet}
              handleChangeLayoutSet={handleChangeLayoutSet}
            />
            <PreviewLimitationsInfo />
            <div className={classes.iframeContainer}>
              <PreviewFrame
                taskId={taskId}
                selectedFormLayoutName={selectedFormLayoutName}
                viewSize={previewViewSize}
              />
            </div>
          </>
        ) : (
          <PreviewDisabledInfo className={classes.disabledInfo} />
        )}
      </div>
    </>
  );
};

type PreviewFrameProps = {
  taskId: string;
  selectedFormLayoutName: string | undefined;
  viewSize: PreviewAsViewSize;
};

// The preview service shows the developer's working copy on a domain of its own, in one session for the page.
const PreviewFrame = ({ taskId, selectedFormLayoutName, viewSize }: PreviewFrameProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: session, isError: isSessionError } = usePreviewSessionQuery(org, app);
  const { data: instance, isError: isInstanceError } = usePreviewSessionInstanceQuery(
    org,
    app,
    session?.url,
    taskId,
  );

  if (isSessionError || isInstanceError) {
    return (
      <StudioCenter>
        <StudioValidationMessage>{t('general.page_error_title')}</StudioValidationMessage>
      </StudioCenter>
    );
  }

  if (!session || !instance) {
    return (
      <StudioCenter>
        <StudioSpinner aria-hidden spinnerTitle={t('preview.loading_preview_controller')} />
      </StudioCenter>
    );
  }

  return (
    <iframe
      title={t('preview.title')}
      src={previewSessionPage(session.url, instance.instanceId, taskId, selectedFormLayoutName)}
      className={viewSize === 'desktop' ? classes.iframeDesktop : classes.iframeMobile}
    />
  );
};
