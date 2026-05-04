import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteValidationOnNavigationLayoutSets = (org: string, app: string) => {
  const { deleteValidationOnNavigationLayoutSets } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteValidationOnNavigationLayoutSets(org, app),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigationLayoutSets, org, app],
      });
    },
  });
};
