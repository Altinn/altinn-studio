import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { CodeList } from '../../types/CodeList';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListData } from '../../types/CodeListData';
import { ArrayUtils } from '@studio/pure-functions';

type CreateOrgCodeListMutationArgs = {
  title: string;
  codeList: CodeList;
};

export const useCreateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createCodeListForOrg } = useServicesContext();

  const mutationFn = ({ title, codeList }: CreateOrgCodeListMutationArgs) =>
    createCodeListForOrg(org, title, codeList);

  return useMutation({
    mutationFn: mutationFn,
    onSuccess: (newData: CodeListData) => {
      console.log('newData', newData);
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], (oldData: CodeListData[]) =>
        ArrayUtils.appendOrCreate(oldData, newData),
      );
    },
  });
};
