import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteGlobalValidationOnNavigation = (org: string, app: string) => {
  const { deleteGlobalValidationOnNavigation } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteGlobalValidationOnNavigation(org, app),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigationLayoutSets, org, app],
      });
    },
  });
};
