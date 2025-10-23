import { useCallback, useEffect, useState } from 'react';

export type PreviewLayoutMetadata = {
  layoutSetName?: string;
  layoutName?: string;
  taskId?: string;
};

export type UsePreviewLayoutMetadataResult = {
  metadata: PreviewLayoutMetadata;
  isPending: boolean;
  error?: string;
  refresh: () => void;
};

export const usePreviewLayoutMetadata = (
  org: string,
  app: string,
): UsePreviewLayoutMetadataResult => {
  const [metadata, setMetadata] = useState<PreviewLayoutMetadata>({});
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const refresh = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchMetadata = async () => {
      setIsPending(true);
      setError(undefined);

      try {
        const layoutSetsResponse = await fetch(
          `/designer/api/${org}/${app}/app-development/layout-sets`,
          {
            credentials: 'same-origin',
          },
        );

        if (!layoutSetsResponse.ok) {
          throw new Error(`layout-sets request failed with status ${layoutSetsResponse.status}`);
        }

        const layoutSetsJson = await layoutSetsResponse.json();
        const firstLayoutSet = layoutSetsJson?.sets?.[0];
        const layoutSetId = firstLayoutSet?.id as string | undefined;

        if (!layoutSetId) {
          throw new Error('No layout sets found for application');
        }

        const layoutSettingsResponse = await fetch(
          `/designer/api/${org}/${app}/app-development/layout-settings?layoutSetName=${encodeURIComponent(
            layoutSetId,
          )}`,
          {
            credentials: 'same-origin',
          },
        );

        if (!layoutSettingsResponse.ok) {
          throw new Error(
            `layout-settings request failed with status ${layoutSettingsResponse.status}`,
          );
        }

        const layoutSettingsJson = await layoutSettingsResponse.json();
        const layoutOrder: unknown = layoutSettingsJson?.pages?.order;
        const firstLayoutName = Array.isArray(layoutOrder) ? (layoutOrder[0] as string) : undefined;
        const tasks: unknown = firstLayoutSet?.tasks;
        const inferredTaskId = Array.isArray(tasks) ? (tasks[0] as string) : undefined;

        if (!firstLayoutName) {
          throw new Error('No layouts found in layout settings response');
        }

        if (!isCancelled) {
          setMetadata({
            layoutSetName: layoutSetId,
            layoutName: firstLayoutName,
            taskId: inferredTaskId ?? 'Task_1',
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setMetadata({});
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!isCancelled) {
          setIsPending(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isCancelled = true;
    };
  }, [app, org, reloadKey]);

  return {
    metadata,
    isPending,
    error,
    refresh,
  };
};
