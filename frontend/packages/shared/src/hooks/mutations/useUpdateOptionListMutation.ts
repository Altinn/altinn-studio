import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import type { OptionsList, OptionsListsResponse } from 'app-shared/types/api/OptionsLists';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { ArrayUtils } from '@studio/pure-functions';

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
      const oldData: OptionsListsResponse = queryClient.getQueryData([
        QueryKey.OptionLists,
        org,
        app,
      ]);
      const newData = updateListInOptionLists(optionListId, updatedOptionList, oldData);
      queryClient.setQueryData([QueryKey.OptionLists, org, app], newData);
      queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], updatedOptionList);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
    },
    meta,
  });
};

const updateListInOptionLists = (
  optionListId: string,
  updatedOptionList: OptionsList,
  oldData: OptionsListsResponse,
): OptionsListsResponse => {
  const oldOptionList = oldData.find((optionList) => optionList.title === optionListId);
  return ArrayUtils.replaceByPredicate(oldData, (optionList) => optionList.title === optionListId, {
    ...oldOptionList,
    data: updatedOptionList,
  });
};
