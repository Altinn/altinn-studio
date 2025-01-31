import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListData } from 'app-shared/types/CodeListData';
import { ArrayUtils } from '@studio/pure-functions';

type UploadOrgCodeListMutationArgs = {
  payload: FormData;
};

export const useUploadOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { uploadCodeListForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ payload }: UploadOrgCodeListMutationArgs) => uploadCodeListForOrg(org, payload),
    onSuccess: (newData: CodeListData) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], (oldData: CodeListData[]) =>
        ArrayUtils.appendOrCreate(oldData, newData),
      );
    },
  });
};
