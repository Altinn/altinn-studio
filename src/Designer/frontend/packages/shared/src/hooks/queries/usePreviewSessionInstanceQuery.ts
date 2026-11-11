import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PreviewSessionInstance } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * An instance at a task in a preview session, created once for each task the page shows. The instance and its form
 * data stay while the session lasts, so returning to a task shows what the developer filled in.
 */
export const usePreviewSessionInstanceQuery = (
  org: string,
  app: string,
  sessionUrl: string | undefined,
  taskId: string,
): UseQueryResult<PreviewSessionInstance> => {
  const { createPreviewSessionInstance } = useServicesContext();
  return useQuery<PreviewSessionInstance>({
    queryKey: [QueryKey.PreviewSessionInstance, org, app, sessionUrl, taskId],
    queryFn: () => createPreviewSessionInstance(org, app, sessionUrl, taskId),
    enabled: !!sessionUrl && !!taskId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
