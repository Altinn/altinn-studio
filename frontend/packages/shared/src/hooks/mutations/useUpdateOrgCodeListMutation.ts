import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { CodeList } from '../../types/CodeList';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListData } from '../../types/CodeListData';

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
    onSuccess: (codeList: CodeListData) => updateCache(queryClient, org, codeList),
  });
};

const updateCache = (queryClient: QueryClient, org: string, codeList: CodeListData): void => {
  const currentCodeLists = queryClient.getQueryData<CodeListData[]>([QueryKey.OrgCodeLists, org]);
  const updatedCodeLists = currentCodeLists.map((item) =>
    item.title === codeList.title ? codeList : item,
  );
  queryClient.setQueryData([QueryKey.OrgCodeLists, org], updatedCodeLists);
};
