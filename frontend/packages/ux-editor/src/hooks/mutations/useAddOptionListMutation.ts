import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAddOptionListMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { uploadOptionList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: FormData) => uploadOptionList(org, app, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org, app] }),
      ]);
    },
  });
};
