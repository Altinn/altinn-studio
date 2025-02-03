import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';
import { FileUtils } from '@studio/pure-functions/src/FileUtils/FileUtils';

export const useUploadOrgCodeListMutation = (org: string) => {
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
  });
};
