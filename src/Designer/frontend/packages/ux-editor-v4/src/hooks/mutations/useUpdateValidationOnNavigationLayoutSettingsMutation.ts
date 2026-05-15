import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IValidationOnNavigationLayoutSettings } from 'app-shared/types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateValidationOnNavigationLayoutSettingsMutation = (org: string, app: string) => {
  const { updateValidationOnNavigationLayoutSettings } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: IValidationOnNavigationLayoutSettings[]) =>
      updateValidationOnNavigationLayoutSettings(org, app, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigationLayoutSettings, org, app],
      });
    },
  });
};
