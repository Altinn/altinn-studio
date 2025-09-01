import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ResourceError, Validation } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the validation status of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of Validation
 */
export const useValidateResourceQuery = (
  org: string,
  repo: string,
  id: string,
): UseQueryResult<Validation, ResourceError> => {
  const { getValidateResource } = useServicesContext();

  return useQuery<Validation, ResourceError>({
    queryKey: [QueryKey.ValidateResource, org, repo, id],
    queryFn: () => getValidateResource(org, repo, id),
    select: (data) => ({
      status: data.status,
      errors: Object.keys(data.errors),
    }),
  });
};
