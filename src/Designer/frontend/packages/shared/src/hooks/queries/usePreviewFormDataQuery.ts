import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PreviewFormData } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';

/** The form data of an instance in preview, read again each time the developer opens it, since the app changes it. */
export const usePreviewFormDataQuery = (
  org: string,
  app: string,
  sessionUrl: string,
  instanceId: string,
  enabled: boolean,
): UseQueryResult<PreviewFormData> => {
  const { readPreviewFormData } = useServicesContext();
  return useQuery<PreviewFormData>({
    queryKey: [QueryKey.PreviewFormData, org, app, sessionUrl, instanceId],
    queryFn: () => readPreviewFormData(org, app, sessionUrl, instanceId),
    enabled,
    gcTime: 0,
    staleTime: 0,
  });
};
