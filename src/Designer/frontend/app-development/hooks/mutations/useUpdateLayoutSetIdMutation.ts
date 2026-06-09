import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateLayoutSetIdMutation = (org: string, app: string) => {
  const { updateLayoutSetId } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      layoutSetIdToUpdate,
      newLayoutSetId,
    }: {
      layoutSetIdToUpdate: string;
      newLayoutSetId: string;
    }) => {
      const result = await updateLayoutSetId(org, app, layoutSetIdToUpdate, newLayoutSetId);
      await queryClient.refetchQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      return result;
    },
  });
};
