import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';

export const useDeleteOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteOrgCodeList } = useServicesContext();

  const mutationFn = (title: string) => deleteOrgCodeList(org, title);

  return useMutation({
    mutationFn,
    onSuccess: (newData: CodeListsResponse) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
  });
};
