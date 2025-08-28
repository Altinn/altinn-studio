import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteLayoutSetMutation = (org: string, app: string) => {
  const { deleteLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate }: { layoutSetIdToUpdate: string }) =>
      deleteLayoutSet(org, app, layoutSetIdToUpdate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
    },
  });
};
