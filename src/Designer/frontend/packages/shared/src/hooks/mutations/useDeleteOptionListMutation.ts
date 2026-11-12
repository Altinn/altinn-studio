import type { MutationMeta, QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteOptionListMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { deleteOptionList } = useServicesContext();

  return useMutation({
    mutationFn: (optionListId: string) =>
      deleteOptionList(org, app, optionListId).then(() => optionListId),
    onSuccess: (optionListId) => {
      setOptionListIdsQueryCache(queryClient, org, app, optionListId);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionLists, org, app] });
      void queryClient.removeQueries({ queryKey: [QueryKey.OptionList, org, app, optionListId] });
    },
    // The backend refuses to delete a code list that a component uses, so the usages known here may be outdated.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: [QueryKey.OptionListsUsage, org, app] });
    },
    meta,
  });
};

const setOptionListIdsQueryCache = (
  queryClient: QueryClient,
  org: string,
  app: string,
  optionListId: string,
) => {
  const currentOptionListIds = queryClient.getQueryData<string[]>([
    QueryKey.OptionListIds,
    org,
    app,
  ]);
  if (currentOptionListIds) {
    const updatedOptionListIds = currentOptionListIds.filter((id) => id !== optionListId);
    void queryClient.setQueryData([QueryKey.OptionListIds, org, app], updatedOptionListIds);
  }
};
