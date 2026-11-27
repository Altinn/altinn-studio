import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PreviewSession } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';
import { usePreviewParty } from 'app-shared/hooks/usePreviewParty';

/**
 * A session ends 30 minutes after the preview service's last request. A page that shows preview again after this
 * long starts a new session rather than use one that may have ended.
 */
const SESSION_STALE_TIME = 25 * 60 * 1000;

/**
 * The app frontend in preview sends a request every 10 minutes while the page is visible, which keeps the session. A
 * page hidden for longer than this may have outlived its session, so it starts a new one when it shows again.
 */
const HIDDEN_TIME_THAT_MAY_END_THE_SESSION = 20 * 60 * 1000;

/**
 * The preview session of the app, started once for the page and for each party the user in preview acts for. The
 * editors reload preview in the same session, as the preview service's ADR has it, so it is a query, though starting
 * a session is a POST.
 */
export const usePreviewSessionQuery = (
  org: string,
  app: string,
): UseQueryResult<PreviewSession> => {
  const { startPreviewSession } = useServicesContext();
  const queryClient = useQueryClient();
  const { party } = usePreviewParty();

  useEffect(() => {
    let hiddenAt: number | undefined;
    const startOverIfHiddenLong = (): void => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== undefined && Date.now() - hiddenAt > HIDDEN_TIME_THAT_MAY_END_THE_SESSION) {
        queryClient.resetQueries({ queryKey: [QueryKey.PreviewSession, org, app] });
      }
      hiddenAt = undefined;
    };
    document.addEventListener('visibilitychange', startOverIfHiddenLong);
    return () => document.removeEventListener('visibilitychange', startOverIfHiddenLong);
  }, [queryClient, org, app]);

  return useQuery<PreviewSession>({
    queryKey: [QueryKey.PreviewSession, org, app, party],
    queryFn: () => startPreviewSession(org, app, party),
    staleTime: SESSION_STALE_TIME,
    gcTime: SESSION_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Starts a new preview session in place of one that has ended. A session the page has already replaced stays
 * replaced.
 */
export const useReplaceEndedPreviewSession = (
  org: string,
  app: string,
): ((endedSessionUrl: string) => void) => {
  const queryClient = useQueryClient();
  const { party } = usePreviewParty();
  return useCallback(
    (endedSessionUrl: string) => {
      const queryKey = [QueryKey.PreviewSession, org, app, party];
      if (queryClient.getQueryData<PreviewSession>(queryKey)?.url === endedSessionUrl) {
        queryClient.resetQueries({ queryKey });
      }
    },
    [queryClient, org, app, party],
  );
};
