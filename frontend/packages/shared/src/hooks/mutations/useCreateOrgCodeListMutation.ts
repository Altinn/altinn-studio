import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { CodeList } from '../../types/CodeList';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListData } from '../../types/CodeListData';

type CreateOrgCodeListMutationArgs = {
  codeListTitle: string;
  codeList: CodeList;
};

export const useCreateOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createCodeListForOrg } = useServicesContext();

  const mutationFn = ({ codeListTitle, codeList }: CreateOrgCodeListMutationArgs) =>
    createCodeListForOrg(org, codeListTitle, codeList);

  return useMutation({
    mutationFn: mutationFn,
    onSuccess: (newData: CodeListData) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], (oldData: CodeListData[]) =>
        oldData ? [...oldData, newData] : [newData],
      );
    },
  });
};
