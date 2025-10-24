import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Alert } from 'admin/types/Alert';
import { alertsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useAlertsQuery = (org: string, env: string): UseQueryResult<Alert[]> => {
  return useQuery<Alert[]>({
    queryKey: [QueryKey.Alerts, org, env],
    queryFn: async ({ signal }) =>
      (await axios.get<Alert[]>(alertsPath(org, env), { signal })).data,
  });
};
