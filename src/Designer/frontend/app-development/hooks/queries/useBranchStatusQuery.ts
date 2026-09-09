import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useBranchStatusQuery = (
  owner,
  app,
  branch,
  meta?: QueryMeta,
): UseQueryResult<BranchStatus, AxiosError<ApiError>> => {
  const { getBranchStatus } = useServicesContext();
  return useQuery<BranchStatus, AxiosError<ApiError>>({
    queryKey: [QueryKey.BranchStatus, owner, app, branch],
    queryFn: () => getBranchStatus(owner, app, branch),
    meta,
  });
};
