import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import { FileUtils } from '@studio/pure-functions';

export const useUploadOrgCodeListMutation = (org: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { uploadCodeListForOrg } = useServicesContext();

  const mutationFn = (file: File) => {
    const formData = FileUtils.convertToFormData(file);
    return uploadCodeListForOrg(org, formData);
  };

  return useMutation({
    mutationFn,
    onSuccess: (newData: CodeListsResponse) => {
      queryClient.setQueryData([QueryKey.OrgCodeLists, org], newData);
    },
    meta,
  });
};
