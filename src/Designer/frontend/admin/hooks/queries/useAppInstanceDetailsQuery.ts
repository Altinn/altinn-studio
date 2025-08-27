import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { instancePath } from '../../utils/apiPaths';
import type { Instance } from '../../types/Instance';

export const useAppInstanceDetailsQuery = (
  org: string,
  env: string,
  app: string,
  id: string,
): UseQueryResult<Instance> => {
  return useQuery<Instance>({
    queryKey: [QueryKey.AppInstanceDetails, org, env, app, id],
    queryFn: async ({ signal }) =>
      (await axios.get<Instance>(instancePath(org, env, app, id), { signal })).data,
  });
};
