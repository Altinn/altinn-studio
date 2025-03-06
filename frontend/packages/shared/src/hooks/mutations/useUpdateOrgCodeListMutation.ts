import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListData } from '../../types/CodeListData';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';

type UpdateOrgCodeListMutationArgs = Pick<CodeListData, 'title' | 'data'>;

export const useUpdateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateCodeListForOrg } = useServicesContext();

  const mutationFn = ({ title, data }: UpdateOrgCodeListMutationArgs) =>
    updateCodeListForOrg(org, title, data);

  return useMutation({
    mutationFn,
    onSuccess: (newData: CodeListsResponse) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
  });
};
