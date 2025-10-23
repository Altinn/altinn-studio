import React from 'react';
import type { ReactElement } from 'react';
import classes from './ToolColumn.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewPage } from 'app-shared/api/paths';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioSpinner } from '@studio/components';
import { usePreviewLayoutMetadata } from '../../hooks/usePreviewLayoutMetadata';
import { ToolColumnMode } from '../../types/ToolColumnMode';

// Actual app preview component for the assistant
const AppPreview = (): ReactElement => {
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

export type ToolColumnProps = {
  mode: ToolColumnMode;
  previewContent: ReactElement;
  fileBrowserContent?: ReactElement;
};

// TODO: Implement Preview and FileExplorer views
export function ToolColumn({
  mode,
  previewContent,
  fileBrowserContent,
}: ToolColumnProps): ReactElement {
  return (
    <div className={classes.container}>
      {mode === ToolColumnMode.Preview && (previewContent || <AppPreview />)}
      {mode === ToolColumnMode.FileExplorer &&
        (fileBrowserContent || (
          <div className={classes.placeholder}>
            <ul className={classes.fileList}>
              <li>📁 src/</li>
              <li>&nbsp;&nbsp;📄 App.tsx</li>
              <li>&nbsp;&nbsp;📄 index.ts</li>
              <li>📁 components/</li>
              <li>&nbsp;&nbsp;📄 Header.tsx</li>
            </ul>
          </div>
        ))}
    </div>
  );
}
