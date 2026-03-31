import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

export const useDeleteBranchMutation = (
  org: string,
  app: string,
): UseMutationResult<void, AxiosError, string> => {
  const { deleteBranch } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchName: string) => deleteBranch(org, app, branchName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Branches, org, app] });
    },
  });
};
