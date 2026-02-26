import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { PublishedApplicationDetails } from 'admin/types/PublishedApplicationDetails';
import { appDetailsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useAppDetailsQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<PublishedApplicationDetails> => {
  return useQuery<PublishedApplicationDetails>({
    queryKey: [QueryKey.PublishedAppDetails, org, env, app],
    queryFn: async ({ signal }) =>
      (await axios.get<PublishedApplicationDetails>(appDetailsPath(org, env, app), { signal }))
        .data,
  });
};
