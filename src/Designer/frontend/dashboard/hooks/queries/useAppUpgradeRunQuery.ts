import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppUpgradeRun } from 'app-shared/types/AppUpgrade';

const pollIntervalMs = 5000;

export const useAppUpgradeRunQuery = (
  org: string,
  app: string,
  branch: string | null,
): UseQueryResult<AppUpgradeRun> => {
  const { getAppUpgradeRun } = useServicesContext();
  return useQuery<AppUpgradeRun>({
    queryKey: [QueryKey.AppUpgradeRun, org, app, branch],
    queryFn: () => getAppUpgradeRun(org, app, branch),
    enabled: Boolean(branch),
    refetchInterval: (query) => (query.state.data?.state === 'Completed' ? false : pollIntervalMs),
    retry: 3,
    meta: { hideDefaultError: true },
  });
};
