import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IValidationOnNavigationLayoutSets } from 'app-shared/types/global';

export const useSaveGlobalValidationOnNavigation = (org: string, app: string) => {
  const { updateGlobalValidationOnNavigation } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedConfig: IValidationOnNavigationLayoutSets) =>
      updateGlobalValidationOnNavigation(org, app, updatedConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigationLayoutSets, org, app],
      });
    },
  });
};
