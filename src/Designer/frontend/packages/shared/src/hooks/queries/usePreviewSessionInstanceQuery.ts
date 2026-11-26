import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PreviewSessionInstance } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import type { HttpError } from 'app-shared/utils/networking';
import { useReplaceEndedPreviewSession } from './usePreviewSessionQuery';

// Preview answers 404 when the session has ended.
const isSessionEnded = (error: HttpError): boolean =>
  error?.response?.status === ServerCodes.NotFound;

/**
 * An instance at a task in a preview session, created once for each task the page shows. The instance and its form
 * data stay while the session lasts, so returning to a task shows what the developer filled in. When the session has
 * ended, the page starts a new one, and the task gets an instance there.
 */
export const usePreviewSessionInstanceQuery = (
  org: string,
  app: string,
  sessionUrl: string | undefined,
  taskId: string,
): UseQueryResult<PreviewSessionInstance> => {
  const { createPreviewSessionInstance } = useServicesContext();
  const replaceEndedSession = useReplaceEndedPreviewSession(org, app);
  return useQuery<PreviewSessionInstance>({
    queryKey: [QueryKey.PreviewSessionInstance, org, app, sessionUrl, taskId],
    queryFn: async () => {
      try {
        return await createPreviewSessionInstance(org, app, sessionUrl, taskId);
      } catch (error) {
        if (isSessionEnded(error)) replaceEndedSession(sessionUrl);
        throw error;
      }
    },
    enabled: !!sessionUrl && !!taskId,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: { hideDefaultError: isSessionEnded },
  });
};
