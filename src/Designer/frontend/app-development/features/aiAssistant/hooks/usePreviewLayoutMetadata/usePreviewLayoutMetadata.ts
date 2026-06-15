import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor-v4/hooks/queries/useFormLayoutSettingsQuery';

export type PreviewLayoutMetadata = {
  layoutSetName?: string;
  layoutName?: string;
  taskId?: string;
};

export type UsePreviewLayoutMetadataResult = {
  metadata: PreviewLayoutMetadata;
  isPending: boolean;
  error?: string;
};

const DEFAULT_TASK_ID = 'Task_1';

export const usePreviewLayoutMetadata = (
  org: string,
  app: string,
): UsePreviewLayoutMetadataResult => {
  const layoutSetsQuery = useLayoutSetsQuery(org, app);

  const firstLayoutSet = layoutSetsQuery.data?.sets?.[0];
  const layoutSetName = firstLayoutSet?.id;

  const layoutSettingsQuery = useFormLayoutSettingsQuery(org, app, layoutSetName);

  const layoutOrder = layoutSettingsQuery.data?.pages?.order;
  const firstLayoutName = Array.isArray(layoutOrder) ? layoutOrder[0] : undefined;
  const tasks = firstLayoutSet?.tasks;
  const taskId = Array.isArray(tasks) ? tasks[0] : undefined;

  const isPending = layoutSetsQuery.isPending || layoutSettingsQuery.isPending;
  const errorMessage = layoutSetsQuery.error?.message ?? layoutSettingsQuery.error?.message;

  const metadata: PreviewLayoutMetadata =
    layoutSetName && firstLayoutName
      ? {
          layoutSetName,
          layoutName: firstLayoutName,
          taskId: taskId ?? DEFAULT_TASK_ID,
        }
      : {};

  return {
    metadata,
    isPending,
    error: errorMessage,
  };
};
