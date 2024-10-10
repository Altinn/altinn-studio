import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAddOptionMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { uploadOption } = useServicesContext();

  return useMutation({
    mutationFn: (payload: FormData) => uploadOption(org, app, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] }).then();
      queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org, app] }).then();
    },
  });
};
