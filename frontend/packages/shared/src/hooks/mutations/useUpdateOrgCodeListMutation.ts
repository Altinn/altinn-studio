import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { CodeList } from '@studio/components';
import { QueryKey } from 'app-shared/types/QueryKey';

type UpdateOrgCodeListMutationArgs = {
  codeListId: string;
  payload: CodeList;
};

export const useUpdateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateCodeListForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ codeListId, payload }: UpdateOrgCodeListMutationArgs) =>
      updateCodeListForOrg(org, codeListId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.OrgCodeLists, org] }),
  });
};
