import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import type { CodeListData } from '../../types/CodeListData';

type DeleteOrgCodeListMutationArgs = Pick<CodeListData, 'title'>;

export const useDeleteOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteCodeListForOrg } = useServicesContext();

  const mutationFn = ({ title }: DeleteOrgCodeListMutationArgs) => deleteCodeListForOrg(org, title);

  return useMutation({
    mutationFn,
    onSuccess: (newData: CodeListsResponse) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
  });
};
