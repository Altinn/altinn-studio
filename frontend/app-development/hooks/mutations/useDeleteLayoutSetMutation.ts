import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { toast } from 'react-toastify';

export const useDeleteLayoutSetMutation = (org: string, app: string) => {
  const { deleteLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate }: { layoutSetIdToUpdate: string }) =>
      deleteLayoutSet(org, app, layoutSetIdToUpdate).catch((error) => {
        toast.error('useDeleteLayoutSetMutation --- ', error);

        return error;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
    },
  });
};
