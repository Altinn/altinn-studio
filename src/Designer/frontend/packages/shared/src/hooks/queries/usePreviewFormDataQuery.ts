import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PreviewFormData } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * The form data of an instance in preview. The form in preview changes it, so it is kept only while a component reads
 * it, and read again the next time.
 */
export const usePreviewFormDataQuery = (
  org: string,
  app: string,
  sessionUrl: string,
  instanceId: string,
): UseQueryResult<PreviewFormData> => {
  const { readPreviewFormData } = useServicesContext();
  return useQuery<PreviewFormData>({
    queryKey: [QueryKey.PreviewFormData, org, app, sessionUrl, instanceId],
    queryFn: () => readPreviewFormData(org, app, sessionUrl, instanceId),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};
