import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

type UploadOrgCodeListMutationArgs = {
  payload: FormData;
};

export const useUploadOrgCodeListMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { uploadCodeListForOrg } = useServicesContext();
  return useMutation({
    mutationFn: ({ payload }: UploadOrgCodeListMutationArgs) => uploadCodeListForOrg(org, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.OrgCodeLists, org] }),
  });
};
