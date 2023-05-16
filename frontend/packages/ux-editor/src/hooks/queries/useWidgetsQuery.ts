import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { get } from 'app-shared/utils/networking';
import { IWidget } from '../../types/global';

export const useWidgetsQuery = (org: string, app: string): UseQueryResult<IWidget[]> => {
  const { getWidgetSettings } = useServicesContext();
  return useQuery(
    [QueryKey.Widgets, org, app],
    async () => {
      const widgetSettings = await getWidgetSettings(org, app);
      const urls: string[] = widgetSettings && widgetSettings?.widgetUrls || [];
      return await Promise.all(urls.map((url) => get<IWidget>(url)));
    }
  );
};
