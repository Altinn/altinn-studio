import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateLayoutSetMutation = (org: string, app: string) => {
  const { updateLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      layoutSetIdToUpdate,
      newLayoutSetId,
    }: {
      layoutSetIdToUpdate: string;
      newLayoutSetId: string;
    }) => updateLayoutSet(org, app, layoutSetIdToUpdate, newLayoutSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
