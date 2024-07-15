import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useBpmnQuery = (org: string, repo: string, enabled: boolean = true) => {
  const { getBpmnFile } = useServicesContext();
  return useQuery<string>({
    queryKey: [QueryKey.FetchBpmn, org, repo],
    queryFn: () => getBpmnFile(org, repo),
    enabled,
  });
};
