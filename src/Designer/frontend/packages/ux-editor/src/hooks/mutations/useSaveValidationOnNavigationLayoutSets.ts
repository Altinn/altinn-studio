import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IValidationOnNavigationLayoutSets } from 'app-shared/types/global';

export const useSaveValidationOnNavigationLayoutSets = (org: string, app: string) => {
  const { updateValidationOnNavigationLayoutSets } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedConfig: IValidationOnNavigationLayoutSets) =>
      updateValidationOnNavigationLayoutSets(org, app, updatedConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigationLayoutSets, org, app],
      });
    },
  });
};
