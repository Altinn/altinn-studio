import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { FileUtils } from 'libs/studio-pure-functions/src';

export const useAddOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { uploadOptionList } = useServicesContext();

  const mutationFn = (file: File) => {
    const formData = FileUtils.convertToFormData(file);
    return uploadOptionList(org, app, formData);
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org, app] });
    },
    meta,
  });
};
