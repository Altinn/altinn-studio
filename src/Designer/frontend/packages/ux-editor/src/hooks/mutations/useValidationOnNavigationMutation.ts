import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';
import type { ExternalConfigState } from '@altinn/ux-editor/components/Settings/SettingsNavigation/ValidateNavigation/utils/ValidateNavigationTypes';

export const useValidationOnNavigationMutation = (
  org: string,
  app: string,
  level: ValidationOnNavigationLevel = ValidationOnNavigationLevel.Global,
) => {
  const { updateValidationOnNavigation } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: ExternalConfigState | ExternalConfigState[]) =>
      updateValidationOnNavigation(org, app, level, config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ValidationOnNavigation, org, app, level],
      });
    },
  });
};
