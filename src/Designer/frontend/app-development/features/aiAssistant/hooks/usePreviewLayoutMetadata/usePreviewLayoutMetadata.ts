import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useFormLayoutSettingsQuery } from 'app-shared/hooks/queries/useFormLayoutSettingsQuery';

const DEFAULT_TASK_ID = 'Task_1';

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

export const usePreviewLayoutMetadata = (
  org: string,
  app: string,
): UsePreviewLayoutMetadataResult => {
  const {
    data: layoutSets,
    isPending: layoutSetsPending,
    error: layoutSetsError,
  } = useLayoutSetsQuery(org, app);

  const firstLayoutSet = layoutSets?.sets?.[0];
  const layoutSetId = firstLayoutSet?.id;

  const {
    data: layoutSettings,
    isPending: layoutSettingsPending,
    error: layoutSettingsError,
  } = useFormLayoutSettingsQuery(org, app, layoutSetId);

  const firstLayoutName = layoutSettings?.pages?.order?.[0];
  const taskId = firstLayoutSet?.tasks?.[0] ?? DEFAULT_TASK_ID;

  const metadata: PreviewLayoutMetadata =
    layoutSetId && firstLayoutName
      ? { layoutSetName: layoutSetId, layoutName: firstLayoutName, taskId }
      : {};

  return {
    metadata,
    isPending: layoutSetsPending || layoutSettingsPending,
    error: layoutSetsError?.message ?? layoutSettingsError?.message,
  };
};
