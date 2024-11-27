import { QueryKey } from 'app-shared/types/QueryKey';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { ObjectUtils } from '@studio/pure-functions';

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
      const oldData: OptionsLists = queryClient.getQueryData([QueryKey.OptionLists, org, app]);
      const ascSortedData = changeIdAndSortCacheData(optionListId, newOptionListId, oldData);
      queryClient.setQueryData([QueryKey.OptionLists, org, app], ascSortedData);
      queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListIds, org, app] });
    },
  });
};

const changeIdAndSortCacheData = (
  oldId: string,
  newId: string,
  oldData: OptionsLists,
): OptionsLists => {
  const newData = { ...oldData };
  delete newData[oldId];
  newData[newId] = oldData[oldId];
  return ObjectUtils.sortEntriesInObjectByKeys(newData);
};
