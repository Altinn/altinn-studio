import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import type { HttpError } from 'app-shared/utils/networking';

// A page loads the status before it renders the components that also read it, such as the header's version control
// buttons. Without a stale time, each of them would fetch it again as it mounts, and every status request fetches from
// Gitea and holds the repository lock. Refreshes after changes invalidate the status, which ignores the stale time.
export const REPO_STATUS_STALE_TIME_MS = 10_000;

export const useRepoStatusQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<RepoStatus, HttpError> => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<RepoStatus, HttpError>({
    queryKey: [QueryKey.RepoStatus, owner, app],
    queryFn: () => getRepoStatus(owner, app),
    staleTime: REPO_STATUS_STALE_TIME_MS,
    meta,
  });
};
