import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ExternalImageUrlValidationResponse } from 'app-shared/types/api/ExternalImageUrlValidationResponse';

export const useValidateImageExternalUrlQuery = (
  org: string,
  app: string,
  url: string,
): UseQueryResult<ExternalImageUrlValidationResponse> => {
  const { validateImageFromExternalUrl } = useServicesContext();
  return useQuery<ExternalImageUrlValidationResponse>({
    queryKey: [QueryKey.ImageUrlValidation, org, app, url],
    queryFn: () => validateImageFromExternalUrl(org, app, url),
    enabled: !!url,
  });
};
