import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type DeleteOrgCodeListMutationArgs = {
  codeListId: string;
};

export const useDeleteOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteCodeListForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ codeListId }: DeleteOrgCodeListMutationArgs) =>
      deleteCodeListForOrg(org, codeListId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.OrgCodeLists, org] }),
  });
};
