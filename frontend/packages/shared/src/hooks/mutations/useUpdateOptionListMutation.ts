import type { MutationMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import type { OptionList, OptionListData } from 'app-shared/types/OptionList';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
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
    onSuccess: (updatedOptionsList: Option[], { optionListId }) => {
      const oldData: OptionListsResponse = queryClient.getQueryData([
        QueryKey.OptionLists,
        org,
        app,
      ]);
      if (isOptionsListInOptionListsCache(oldData)) {
        const newData = updateListInOptionsListsData(optionListId, updatedOptionsList, oldData);
        queryClient.setQueryData([QueryKey.OptionLists, org, app], newData);
      }
      queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], updatedOptionsList);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
    },
    meta,
  });
};

const isOptionsListInOptionListsCache = (data: OptionListsResponse | null): boolean => !!data;

const updateListInOptionsListsData = (
  optionsListId: string,
  updatedOptionsList: OptionList,
  oldData: OptionListsResponse,
): OptionListsResponse => {
  const [oldOptionsListData, optionsListExists]: [OptionListData | undefined, boolean] =
    getOldOptionsListData(oldData, optionsListId);
  if (optionsListExists) {
    return updateExistingOptionsList(oldData, oldOptionsListData, updatedOptionsList);
  }
  return addNewOptionsList(oldData, optionsListId, updatedOptionsList);
};

const getOldOptionsListData = (
  oldData: OptionListsResponse,
  optionsListId: string,
): [OptionListData | undefined, boolean] => {
  const oldOptionsListData = oldData.find(
    (optionsListData) => optionsListData.title === optionsListId,
  );
  return [oldOptionsListData, !!oldOptionsListData];
};

const updateExistingOptionsList = (
  oldData: OptionListsResponse,
  oldOptionsListData: OptionListData,
  newOptionsList: OptionList,
) => {
  return ArrayUtils.replaceByPredicate(
    oldData,
    (optionsList) => optionsList.title === oldOptionsListData.title,
    {
      ...oldOptionsListData,
      data: newOptionsList,
    },
  );
};

const addNewOptionsList = (
  oldData: OptionListsResponse,
  optionsListTitle: string,
  newOptionsList: OptionList,
) => {
  return ArrayUtils.prepend(oldData, { title: optionsListTitle, data: newOptionsList });
};
