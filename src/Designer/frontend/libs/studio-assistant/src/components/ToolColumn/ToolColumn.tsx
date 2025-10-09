import React from 'react';
import type { ReactElement } from 'react';
import { ViewType } from '../../types/ViewType';
import classes from './ToolColumn.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { previewPage } from 'app-shared/api/paths';
import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioSpinner } from '@studio/components';

// Actual app preview component for the assistant
const AppPreview = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: user } = useUserQuery();

  // For now, use default layout values - this can be enhanced to get current layout
  const selectedFormLayoutSetName = '1';
  const selectedFormLayoutName = '1';
  const taskId = 'Task_1';

  const {
    mutate: createInstance,
    data: instance,
    isPending: createInstancePending,
    isError: createInstanceError,
  } = useCreatePreviewInstanceMutation(org, app);

  React.useEffect(() => {
    if (user && taskId) createInstance({ partyId: user?.id, taskId: taskId });
  }, [createInstance, user, taskId]);

  if (createInstancePending || !instance) {
    return (
      <StudioCenter>
        {createInstanceError ? (
          <div style={{ color: '#f44336' }}>Error loading preview</div>
        ) : (
          <StudioSpinner spinnerTitle='Loading preview...' aria-hidden='true' />
        )}
      </StudioCenter>
    );
  }

  const previewURL = previewPage(
    org,
    app,
    selectedFormLayoutSetName,
    taskId,
    selectedFormLayoutName,
    instance?.id,
  );

  return (
    <div className={classes.previewContainer}>
      <iframe className={classes.previewIframe} title='App Preview' src={previewURL} />
    </div>
  );
};

export type ToolColumnProps = {
  selectedView: ViewType;
  previewContent?: ReactElement;
  fileBrowserContent?: ReactElement;
};

export function ToolColumn({
  selectedView,
  previewContent,
  fileBrowserContent,
}: ToolColumnProps): ReactElement {
  return (
    <div className={classes.container}>
      {selectedView === ViewType.Preview && (
        <div className={classes.tabContent}>
          <AppPreview />
        </div>
      )}
      {selectedView === ViewType.FileExplorer && (
        <div className={classes.tabContent}>
          {fileBrowserContent || (
            <div className={classes.placeholder}>
              <ul className={classes.fileList}>
                <li>📁 src/</li>
                <li>&nbsp;&nbsp;📄 App.tsx</li>
                <li>&nbsp;&nbsp;📄 index.ts</li>
                <li>📁 components/</li>
                <li>&nbsp;&nbsp;📄 Header.tsx</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
