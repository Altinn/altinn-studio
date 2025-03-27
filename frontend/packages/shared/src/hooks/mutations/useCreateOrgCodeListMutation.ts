import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import type { CodeListData } from '../../types/CodeListData';

type CreateOrgCodeListMutationArgs = Pick<CodeListData, 'title' | 'data'>;

export const useCreateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createCodeListForOrg } = useServicesContext();

  const mutationFn = ({ title, data }: CreateOrgCodeListMutationArgs) =>
    createCodeListForOrg(org, title, data);

  return useMutation({
    mutationFn,
    onSuccess: (newData: CodeListsResponse) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
  });
};
