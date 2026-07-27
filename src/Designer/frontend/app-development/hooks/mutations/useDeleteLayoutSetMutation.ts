import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const useDeleteLayoutSetMutation = (org: string, app: string) => {
  const { deleteLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate }: { layoutSetIdToUpdate: string }) =>
      deleteLayoutSet(org, app, layoutSetIdToUpdate),
    onSuccess: (_, { layoutSetIdToUpdate }) => {
      // Drop the deleted set from the cache synchronously so derived values (e.g. the custom receipt
      // id) update before the refetch resolves, avoiding a remount that queries the deleted folder.
      queryClient.setQueryData<LayoutSets>([QueryKey.LayoutSets, org, app], (layoutSets) =>
        layoutSets?.filter((layoutSet) => layoutSet.id !== layoutSetIdToUpdate),
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
    },
  });
};
