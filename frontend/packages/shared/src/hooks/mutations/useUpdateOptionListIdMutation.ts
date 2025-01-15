import { QueryKey } from 'app-shared/types/QueryKey';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { ArrayUtils } from '@studio/pure-functions';

export interface UpdateOptionListIdMutationArgs {
  optionListId: string;
  newOptionListId: string;
}

export const useUpdateOptionListIdMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { updateOptionListId } = useServicesContext();

  return useMutation({
    mutationFn: async ({ optionListId, newOptionListId }: UpdateOptionListIdMutationArgs) => {
      return updateOptionListId(org, app, optionListId, newOptionListId).then(() => ({
        optionListId,
        newOptionListId,
      }));
    },
    onSuccess: ({ optionListId, newOptionListId }) => {
      const oldData: OptionListsResponse = queryClient.getQueryData([
        QueryKey.OptionLists,
        org,
        app,
      ]);
      const ascSortedData = changeIdAndSortCacheData(optionListId, newOptionListId, oldData);
      queryClient.setQueryData([QueryKey.OptionLists, org, app], ascSortedData);
      // Currently we only need to remove the old and not set the new, since mutating the Id only happens from the library which uses the large OptionLists cache
      queryClient.removeQueries({ queryKey: [QueryKey.OptionList, org, app, optionListId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
    },
  });
};

const changeIdAndSortCacheData = (
  oldId: string,
  newId: string,
  oldData: OptionListsResponse,
): OptionListsResponse => {
  const oldOptionList = oldData.find((optionList) => optionList.title === oldId);
  const newOptionLists: OptionListsResponse = ArrayUtils.replaceByPredicate(
    oldData,
    (optionList) => optionList.title === oldId,
    { ...oldOptionList, title: newId },
  );
  return newOptionLists.sort((a, b) => a.title.localeCompare(b.title));
};
