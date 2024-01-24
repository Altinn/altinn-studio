import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { get } from 'app-shared/utils/networking';
import type { IWidget } from '../../types/global';

export const useWidgetsQuery = (org: string, app: string): UseQueryResult<IWidget[]> => {
  const { getWidgetSettings } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.Widgets, org, app],
    queryFn: async () => {
      const widgetSettings = await getWidgetSettings(org, app);
      const urls: string[] = (widgetSettings && widgetSettings?.widgetUrls) || [];
      return await Promise.all(urls.map((url) => get<IWidget>(url)));
    },
  });
};
