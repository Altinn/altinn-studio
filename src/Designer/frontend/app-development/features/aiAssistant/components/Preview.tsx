import type { ReactElement } from 'react';
import { PreviewDisabledInfo } from 'app-shared/components/PreviewDisabledInfo/PreviewDisabledInfo';
import { previewSessionHashPage, previewSessionPage } from 'app-shared/api/paths';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { usePreviewSessionQuery } from 'app-shared/hooks/queries/usePreviewSessionQuery';
import { usePreviewSessionInstanceQuery } from 'app-shared/hooks/queries/usePreviewSessionInstanceQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { MAXIMUM_SUPPORTED_FRONTEND_VERSION, NEXT_V9_VERSION } from 'app-shared/constants';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';
import { StudioAlert, StudioCenter, StudioSpinner } from '@designer/components';
import { usePreviewLayoutMetadata } from '../hooks/usePreviewLayoutMetadata/usePreviewLayoutMetadata';
import classes from './Preview.module.css';

export const Preview = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: version, isPending: versionPending } = useAppVersionQuery(org, app);

  if (versionPending) return <PreviewSpinner />;

  // The preview service shows v8 and v9 apps. Older apps keep the notice that preview is turned off.
  const isV9 = !!version && !isBelowSupportedVersion(version.frontendVersion, NEXT_V9_VERSION);
  const isV8 =
    !!version &&
    !isV9 &&
    !isBelowSupportedVersion(version.frontendVersion, MAXIMUM_SUPPORTED_FRONTEND_VERSION);
  if (!isV9 && !isV8) {
    return (
      <StudioCenter>
        <PreviewDisabledInfo />
      </StudioCenter>
    );
  }
  return <PreviewFrame isV9={isV9} />;
};

const PreviewSpinner = (): ReactElement => (
  <StudioCenter>
    <StudioSpinner spinnerTitle='Loading preview...' aria-hidden='true' />
  </StudioCenter>
);

type PreviewFrameProps = {
  isV9: boolean;
};

// The preview service shows the developer's working copy on a domain of its own, in one session for the page.
const PreviewFrame = ({ isV9 }: PreviewFrameProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);

  const { metadata: layoutMetadata, error: layoutMetadataError } = usePreviewLayoutMetadata(
    org,
    app,
  );
  // A v9 app's layout set is named after its task, and a v8 app's names its task.
  const { layoutName } = layoutMetadata;
  const taskId = isV9 ? layoutMetadata.layoutSetName : layoutMetadata.taskId;
  const pageUrl = isV9 ? previewSessionPage : previewSessionHashPage;

  const { data: session, isError: sessionError } = usePreviewSessionQuery(org, app);
  const { data: instance, isError: instanceError } = usePreviewSessionInstanceQuery(
    org,
    app,
    session?.url,
    taskId,
  );

  const previewError =
    layoutMetadataError || (sessionError || instanceError ? 'Error loading preview' : undefined);

  if (previewError) {
    return (
      <StudioCenter>
        <StudioAlert data-color='danger'>{previewError}</StudioAlert>
      </StudioCenter>
    );
  }

  if (!session || !instance) return <PreviewSpinner />;

  return (
    <div className={classes.previewContainer}>
      <iframe
        key={currentBranchInfo?.commitSha}
        className={classes.previewIframe}
        title='App Preview'
        src={pageUrl(session.url, instance.instanceId, taskId, layoutName)}
      />
    </div>
  );
};
