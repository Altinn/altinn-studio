import React from 'react';
import { previewPage } from 'app-shared/api/paths';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioCenter, StudioSpinner } from '@studio/components';
import type { ReactElement } from 'react';
import { usePreviewLayoutMetadata } from '../hooks/usePreviewLayoutMetadata/usePreviewLayoutMetadata';
import classes from './Preview.module.css';

export const Preview = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: user, isPending: userPending } = useUserQuery();

  const [iframeKey, setIframeKey] = React.useState(0);
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

  React.useEffect(() => {
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

  // Listen for repository reset events to reload the preview
  React.useEffect(() => {
    const handleRepoReset = (): void => {
      setIframeKey((prev) => prev + 1);
    };

    window.addEventListener('altinity-repo-reset', handleRepoReset as EventListener);

    return (): void => {
      window.removeEventListener('altinity-repo-reset', handleRepoReset as EventListener);
    };
  }, []);

  const { layoutSetName, layoutName, taskId } = layoutMetadata;
  const previewError =
    layoutMetadataError || (createInstanceError ? 'Error loading preview' : undefined);
  const isLoading =
    userPending ||
    layoutMetadataPending ||
    !layoutSetName ||
    !layoutName ||
    !taskId ||
    createInstancePending ||
    !instance;

  if (isLoading) {
    return (
      <StudioCenter>
        {previewError ? (
          <div style={{ color: '#f44336' }}>{previewError}</div>
        ) : (
          <StudioSpinner spinnerTitle='Loading preview...' aria-hidden='true' />
        )}
      </StudioCenter>
    );
  }

  const previewURL = previewPage(org, app, layoutSetName, taskId, layoutName, instance.id);

  return (
    <div className={classes.previewContainer}>
      <iframe
        key={iframeKey}
        className={classes.previewIframe}
        title='App Preview'
        src={previewURL}
      />
    </div>
  );
};
