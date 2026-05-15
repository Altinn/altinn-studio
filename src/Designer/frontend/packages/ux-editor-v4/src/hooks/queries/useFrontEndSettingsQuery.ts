import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IFrontEndSettings } from 'app-shared/types/global';

export const useFrontEndSettingsQuery = (
  org: string,
  app: string,
): UseQueryResult<IFrontEndSettings> => {
  const { getFrontEndSettings } = useServicesContext();
  return useQuery<IFrontEndSettings>({
    queryKey: [QueryKey.FrontEndSettings, org, app],
    queryFn: () => getFrontEndSettings(org, app),
  });
};
