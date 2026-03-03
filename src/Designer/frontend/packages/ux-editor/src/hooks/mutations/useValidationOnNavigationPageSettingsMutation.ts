import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IValidationOnNavigationPageSettings } from 'app-shared/types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useValidationOnNavigationPageSettingsMutation = (org: string, app: string) => {
  const { saveValidationOnNavigationPageSettings } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: IValidationOnNavigationPageSettings[]) =>
      saveValidationOnNavigationPageSettings(org, app, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigationPageSettings, org, app],
      });
    },
  });
};
