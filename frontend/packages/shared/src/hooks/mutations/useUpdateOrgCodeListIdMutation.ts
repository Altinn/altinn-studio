import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ArrayUtils } from '@studio/pure-functions';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';
import type { CodeListData } from '@studio/content-library';

type UpdateOrgCodeListIdMutationArgs = { codeListId: string; newCodeListId: string };

export const useUpdateOrgCodeListIdMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateOrgCodeListId } = useServicesContext();

  return useMutation({
    mutationFn: async ({ codeListId, newCodeListId }: UpdateOrgCodeListIdMutationArgs) =>
      updateOrgCodeListId(org, codeListId, newCodeListId).then(() => ({
        codeListId,
        newCodeListId,
      })),
    onSuccess: ({ codeListId, newCodeListId }) => {
      const oldData: CodeListsResponse = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
      const newData: CodeListsResponse = updateId(codeListId, newCodeListId, oldData);
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
  });
};

const updateId = (oldId: string, newId: string, oldData: CodeListsResponse): CodeListsResponse => {
  if (!oldData) return [];

  const oldCodeList: CodeListData = oldData.find(
    (codeList: CodeListData): boolean => codeList.title === oldId,
  );

  return ArrayUtils.replaceByPredicate(
    oldData,
    (codeList: CodeListData): boolean => codeList.title === oldId,
    { ...oldCodeList, title: newId },
  );
};
