import { useQuery } from '@tanstack/react-query';
import { getBpmnFile } from 'app-shared/api/queries';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useBpmnQuery = (org: string, repo: string) => {
  return useQuery<string>([QueryKey.FetchBpmn, org, repo], () => getBpmnFile(org, repo));
};
