import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { AppSettings } from 'app-shared/types/AppSettings';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateAppSettingsMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();
  const { updateAppSettings } = useServicesContext();

  return useMutation({
    mutationFn: (payload: AppSettings) => updateAppSettings(org, app, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.AppSettings, org, app] }),
  });
};
