import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ILayoutSettings } from 'app-shared/types/global';

export const useFormLayoutSettingsQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<ILayoutSettings> => {
  const { getFormLayoutSettings } = useServicesContext();
  return useQuery<ILayoutSettings>({
    queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
    queryFn: () => getFormLayoutSettings(org, app, layoutSetName),
  });
};
