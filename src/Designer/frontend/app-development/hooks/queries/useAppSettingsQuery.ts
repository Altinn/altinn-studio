import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { AppSettings } from 'app-shared/types/AppSettings';

export const useAppSettingsQuery = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { getAppSettings } = useServicesContext();

  return useQuery<AppSettings>({
    queryKey: [QueryKey.AppSettings, org, app],
    queryFn: () => getAppSettings(org, app),
  });
};
