import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export type PreviewLayoutMetadata = {
  layoutSetName?: string;
  layoutName?: string;
  taskId?: string;
};

export type UsePreviewLayoutMetadataResult = {
  metadata: PreviewLayoutMetadata;
  isPending: boolean;
  error?: string;
  dataUpdatedAt: number;
};

export const usePreviewLayoutMetadata = (
  org: string,
  app: string,
): UsePreviewLayoutMetadataResult => {
  const layoutSetsQuery = useLayoutSetsQuery(org, app);

  const firstLayoutSet = layoutSetsQuery.data?.sets?.[0];
  const layoutSetName = firstLayoutSet?.id;

  const { getFormLayoutSettings } = useServicesContext();
  const layoutSettingsQuery = useQuery({
    queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
    queryFn: () => getFormLayoutSettings(org, app, layoutSetName),
    enabled: !!layoutSetName,
  });

  const layoutOrder = layoutSettingsQuery.data?.pages?.order;
  const firstLayoutName = Array.isArray(layoutOrder) ? layoutOrder[0] : undefined;
  const tasks = firstLayoutSet?.tasks;
  const taskId = Array.isArray(tasks) ? tasks[0] : undefined;

  const isPending = layoutSetsQuery.isPending || layoutSettingsQuery.isPending;
  const errorMessage =
    layoutSetsQuery.error?.message ?? layoutSettingsQuery.error?.message ?? undefined;

  const dataUpdatedAt = Math.max(
    layoutSetsQuery.dataUpdatedAt ?? 0,
    layoutSettingsQuery.dataUpdatedAt ?? 0,
  );

  const metadata: PreviewLayoutMetadata =
    layoutSetName && firstLayoutName
      ? {
          layoutSetName,
          layoutName: firstLayoutName,
          taskId: taskId ?? 'Task_1',
        }
      : {};

  return {
    metadata,
    isPending,
    error: errorMessage,
    dataUpdatedAt,
  };
};
