import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';

export const useDeleteLayoutSetMutation = (org: string, app: string) => {
  const { deleteLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();
  const [, , removeSelectedLayoutSet] = useLocalStorage<string>('layoutSet/' + app, null);

  return useMutation({
    mutationFn: ({ layoutSetIdToUpdate }: { layoutSetIdToUpdate: string }) =>
      deleteLayoutSet(org, app, layoutSetIdToUpdate),
    onSuccess: () => {
      removeSelectedLayoutSet();
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
