import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

type BpmnQueryOptions = Pick<UseQueryOptions<string>, 'refetchOnMount'>;

export const useBpmnQuery = (
  org: string,
  repo: string,
  enabled: boolean = true,
  options: BpmnQueryOptions = {},
) => {
  const { getBpmnFile } = useServicesContext();
  return useQuery<string>({
    queryKey: [QueryKey.FetchBpmn, org, repo],
    queryFn: () => getBpmnFile(org, repo),
    enabled,
    ...options,
  });
};
