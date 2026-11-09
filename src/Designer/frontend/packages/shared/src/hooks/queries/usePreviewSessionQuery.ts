import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PreviewSession } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * A session ends 30 minutes after the preview service's last request. A page that shows preview again after this
 * long starts a new session rather than use one that may have ended.
 */
const SESSION_STALE_TIME = 25 * 60 * 1000;

/**
 * The preview session of the app, started once for the page. The editors reload preview in the same session, as the
 * preview service's ADR has it, so it is a query, though starting a session is a POST.
 */
export const usePreviewSessionQuery = (
  org: string,
  app: string,
): UseQueryResult<PreviewSession> => {
  const { startPreviewSession } = useServicesContext();
  return useQuery<PreviewSession>({
    queryKey: [QueryKey.PreviewSession, org, app],
    queryFn: () => startPreviewSession(org, app),
    staleTime: SESSION_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
