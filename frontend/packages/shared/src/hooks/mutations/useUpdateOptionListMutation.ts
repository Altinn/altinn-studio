import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import type {
  OptionsList,
  OptionsListData,
  OptionsListsResponse,
} from 'app-shared/types/api/OptionsLists';
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
      if (isOptionsListInOptionListsCache(oldData)) {
        const newData = updateListInOptionListsData(optionListId, updatedOptionList, oldData);
        queryClient.setQueryData([QueryKey.OptionLists, org, app], newData);
      }
      queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], updatedOptionList);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
    },
    meta,
  });
};

const isOptionsListInOptionListsCache = (data: OptionsListsResponse | null): boolean => !!data;

const updateListInOptionListsData = (
  optionListId: string,
  updatedOptionList: OptionsList,
  oldData: OptionsListsResponse,
): OptionsListsResponse => {
  const oldOptionsListData: OptionsListData = oldData.find(
    (optionListData) => optionListData.title === optionListId,
  );
  if (!!oldOptionsListData) {
    return updateExistingOptionList(oldData, oldOptionsListData, updatedOptionList);
  }
  return addNewOptionList(oldData, optionListId, updatedOptionList);
};

const updateExistingOptionList = (
  oldData: OptionsListsResponse,
  oldOptionsListData: OptionsListData,
  newOptionsList: OptionsList,
) => {
  return ArrayUtils.replaceByPredicate(
    oldData,
    (optionList) => optionList.title === oldOptionsListData.title,
    {
      ...oldOptionsListData,
      data: newOptionsList,
    },
  );
};

const addNewOptionList = (
  oldData: OptionsListsResponse,
  optionListTitle: string,
  newOptionsList: OptionsList,
) => {
  return ArrayUtils.prepend(oldData, { title: optionListTitle, data: newOptionsList });
};
