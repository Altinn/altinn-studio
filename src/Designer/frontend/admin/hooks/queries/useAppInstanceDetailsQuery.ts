import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { instanceDetailsPath } from 'admin/utils/apiPaths';
import type { SimpleInstanceDetails } from 'admin/types/SimpleInstanceDetails';

export const useAppInstanceDetailsQuery = (
  org: string,
  env: string,
  app: string,
  id: string,
): UseQueryResult<SimpleInstanceDetails> => {
  return useQuery<SimpleInstanceDetails>({
    queryKey: [QueryKey.AppInstanceDetails, org, env, app, id],
    queryFn: async ({ signal }) =>
      (await axios.get<SimpleInstanceDetails>(instanceDetailsPath(org, env, app, id), { signal }))
        .data,
  });
};
