import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { CodeList } from '@studio/components';
import { QueryKey } from 'app-shared/types/QueryKey';

type CreateOrgCodeListMutationArgs = {
  codeListId: string;
  payload: CodeList;
};

export const useCreateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createCodeListForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ codeListId, payload }: CreateOrgCodeListMutationArgs) =>
      createCodeListForOrg(org, codeListId, payload),
    onSuccess: (data) => queryClient.setQueryData([QueryKey.OrgCodeLists, org], data),
  });
};
