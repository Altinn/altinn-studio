import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OptionList, OptionListData } from 'app-shared/types/OptionList';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { ArrayUtils } from '@studio/pure-functions';

export interface UpdateOptionListMutationArgs {
  optionListId: string;
  optionList: OptionList;
}

export const useUpdateOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { updateOptionList } = useServicesContext();

  return useMutation<OptionList, Error, UpdateOptionListMutationArgs>({
    mutationFn: ({ optionListId, optionList }: UpdateOptionListMutationArgs) => {
      return updateOptionList(org, app, optionListId, optionList);
    },
    onSuccess: (updatedOptionsList: OptionList, { optionListId }) => {
      const oldData: OptionListsResponse = queryClient.getQueryData([
        QueryKey.OptionLists,
        org,
        app,
      ]);
      if (isOptionsListInOptionListsCache(oldData)) {
        const newData = updateListInOptionListDataList(optionListId, updatedOptionsList, oldData);
        queryClient.setQueryData([QueryKey.OptionLists, org, app], newData);
      }
      queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], updatedOptionsList);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
    },
    meta,
  });
};

const isOptionsListInOptionListsCache = (data: OptionListsResponse | null): boolean => !!data;

const updateListInOptionListDataList = (
  optionListId: string,
  updatedOptionList: OptionList,
  oldData: OptionListsResponse,
): OptionListsResponse => {
  const [oldOptionsListData, optionsListExists]: [OptionListData | undefined, boolean] =
    getOldOptionListData(oldData, optionListId);
  if (optionsListExists) {
    return updateExistingOptionList(oldData, oldOptionsListData, updatedOptionList);
  }
  return addNewOptionList(oldData, optionListId, updatedOptionList);
};

const getOldOptionListData = (
  oldData: OptionListsResponse,
  optionListId: string,
): [OptionListData | undefined, boolean] => {
  const oldOptionsListData = oldData.find(
    (optionListData) => optionListData.title === optionListId,
  );
  return [oldOptionsListData, !!oldOptionsListData];
};

const updateExistingOptionList = (
  oldData: OptionListsResponse,
  oldOptionListData: OptionListData,
  newOptionList: OptionList,
) => {
  return ArrayUtils.replaceByPredicate(
    oldData,
    (optionsList) => optionsList.title === oldOptionListData.title,
    {
      ...oldOptionListData,
      data: newOptionList,
    },
  );
};

const addNewOptionList = (
  oldData: OptionListsResponse,
  optionListTitle: string,
  newOptionList: OptionList,
) => {
  return ArrayUtils.prepend(oldData, { title: optionListTitle, data: newOptionList });
};
