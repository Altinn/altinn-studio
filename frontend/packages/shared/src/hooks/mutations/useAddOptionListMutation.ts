import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAddOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { uploadOptionList } = useServicesContext();

  const mutationFn = (file: File) => {
    const formData = createFormDataWithFile(file);
    return uploadOptionList(org, app, formData);
  };

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org, app] }),
      ]);
    },
    meta,
  });
};

const createFormDataWithFile = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};
