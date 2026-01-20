import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListDataWithTextResources } from '../../types/CodeListDataWithTextResources';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';

type UpdateOrgCodeListMutationArgs = Pick<CodeListDataWithTextResources, 'title' | 'data'>;

export const useUpdateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateOrgCodeList } = useServicesContext();

  const mutationFn = ({ title, data }: UpdateOrgCodeListMutationArgs) =>
    updateOrgCodeList(org, title, data);

  return useMutation({
    mutationFn,
    onSuccess: (newData: CodeListsResponse) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
  });
};
