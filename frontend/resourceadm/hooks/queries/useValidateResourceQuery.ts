import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Validation } from 'app-shared/types/ResourceAdm';

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
  id: string
): UseQueryResult<Validation> => {
  const { getValidateResource } = useServicesContext();

  return useQuery<Validation>(
    [QueryKey.ValidateResource, org, repo, id],
    () => getValidateResource(org, repo, id),
    {
      select: (data) => {
        return { status: data.status, errors: Object.keys(data.errors) };
      },
    }
  );
};
