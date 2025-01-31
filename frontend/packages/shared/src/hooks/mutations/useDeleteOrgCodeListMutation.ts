import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListData } from '../../types/CodeListData';

type DeleteOrgCodeListMutationArgs = {
  codeListId: string;
};

export const useDeleteOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteCodeListForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ codeListId }: DeleteOrgCodeListMutationArgs) =>
      deleteCodeListForOrg(org, codeListId),
    onSuccess: (codeListId: string) => removeItemFromCache(queryClient, org, codeListId),
  });
};

const removeItemFromCache = (queryClient: QueryClient, org: string, codeListId: string): void => {
  const currentCodeLists = queryClient.getQueryData<CodeListData[]>([QueryKey.OrgCodeLists, org]);
  if (currentCodeLists) {
    const updatedCodeLists = currentCodeLists.filter((codeList) => codeList.title !== codeListId);
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], updatedCodeLists);
  } else {
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], null);
  }
};
