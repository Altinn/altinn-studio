import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import { toast } from 'react-toastify';

export const useBpmnQuery = (org: string, repo: string, enabled: boolean = true) => {
  const { getBpmnFile } = useServicesContext();
  return useQuery<string>({
    queryKey: [QueryKey.FetchBpmn, org, repo],
    queryFn: () =>
      getBpmnFile(org, repo).catch((error) => {
        toast.error('useBpmnQuery --- ', error);

        return error;
      }),
    enabled,
  });
};
