import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ProcessChange, ProcessState } from 'app-shared/types/api/ProcessState';
import { processDependencyQueryKeys } from 'app-shared/queryInvalidator/processDependencyQueryKeys';

export function useProcessState(org: string, app: string) {
  const { getProcessState } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.ProcessState, org, app],
    queryFn: () => getProcessState(org, app),
    refetchOnWindowFocus: false,
  });
}

export function useProcessChangeMutation(org: string, app: string) {
  const { updateProcessState } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: ProcessChange) => updateProcessState(org, app, change),
    retry: false,
    meta: { hideDefaultError: true },
    onSuccess: (state: ProcessState) => {
      queryClient.setQueryData([QueryKey.ProcessState, org, app], state);
      queryClient.setQueryData([QueryKey.FetchBpmn, org, app], state.bpmnXml);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.AppValidation, org, app] });
    },
  });
}

/** Query failures must not block importing the saved process. */
export function useRefreshProcessDependencies(org: string, app: string) {
  const queryClient = useQueryClient();
  return async (): Promise<void> => {
    await Promise.all(
      processDependencyQueryKeys.map((key) =>
        queryClient.invalidateQueries({ queryKey: [key, org, app] }),
      ),
    );
  };
}
