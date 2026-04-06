import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { previewPage } from 'app-shared/api/paths';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { StudioAlert, StudioCenter, StudioSpinner } from '@studio/components';
import { usePreviewLayoutMetadata } from '../hooks/usePreviewLayoutMetadata/usePreviewLayoutMetadata';
import classes from './Preview.module.css';

export const Preview = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: user } = useUserQuery();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);

  const {
    mutate: createInstance,
    data: instance,
    isPending: createInstancePending,
    isError: createInstanceError,
  } = useCreatePreviewInstanceMutation(org, app);

  const {
    metadata: layoutMetadata,
    isPending: layoutMetadataPending,
    error: layoutMetadataError,
  } = usePreviewLayoutMetadata(org, app);

  useEffect(() => {
    const { taskId } = layoutMetadata;
    if (!user || !taskId || layoutMetadataPending || createInstancePending || instance) {
      return;
    }

    createInstance({ partyId: user.id, taskId });
  }, [
    createInstance,
    createInstancePending,
    instance,
    layoutMetadata,
    layoutMetadataPending,
    user,
  ]);

  const { layoutSetName, layoutName, taskId } = layoutMetadata;

  const previewError =
    layoutMetadataError || (createInstanceError ? 'Error loading preview' : undefined);

  if (!instance && !previewError) {
    return (
      <StudioCenter>
        <StudioSpinner spinnerTitle='Loading preview...' aria-hidden='true' />
      </StudioCenter>
    );
  }

  if (previewError) {
    return (
      <StudioCenter>
        <StudioAlert data-color='danger'>{previewError}</StudioAlert>
      </StudioCenter>
    );
  }

  const previewURL = previewPage(org, app, layoutSetName, taskId, layoutName, instance.id);

  return (
    <div className={classes.previewContainer}>
      <iframe
        key={currentBranchInfo?.commitSha}
        className={classes.previewIframe}
        title='App Preview'
        src={previewURL}
      />
    </div>
  );
};
