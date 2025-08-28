import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

export const useBpmnQuery = (org: string, repo: string, enabled: boolean = true) => {
  const { getBpmnFile } = useServicesContext();
  return useQuery<string>({
    queryKey: [QueryKey.FetchBpmn, org, repo],
    queryFn: () => getBpmnFile(org, repo),
    enabled,
  });
};
