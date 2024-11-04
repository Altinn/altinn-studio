import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export interface UpdateOptionListMutationArgs {
  optionListId: string;
  optionsList: Option[];
}

export const useUpdateOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { updateOptionList } = useServicesContext();

  return useMutation({
    mutationFn: ({ optionListId, optionsList }: UpdateOptionListMutationArgs) => {
      return updateOptionList(org, app, optionListId, optionsList);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org, app] });
    },
    meta,
  });
};
