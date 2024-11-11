import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export interface UpdateOptionListMutationArgs {
  optionListId: string;
  optionsList: Option[];
}

export const useUpdateOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { updateOptionList } = useServicesContext();

  return useMutation<Option[], Error, UpdateOptionListMutationArgs>({
    mutationFn: ({ optionListId, optionsList }: UpdateOptionListMutationArgs) => {
      return updateOptionList(org, app, optionListId, optionsList);
    },
    onSuccess: (updatedOptionList: Option[], { optionListId }) => {
      const oldData: OptionsLists = queryClient.getQueryData([QueryKey.OptionLists, org, app]);
      const newData = { ...oldData };
      newData[optionListId] = updatedOptionList;
      queryClient.setQueryData([QueryKey.OptionLists, org, app], newData);
    },
    meta,
  });
};
