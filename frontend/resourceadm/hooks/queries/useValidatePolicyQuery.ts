import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Validation } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the validation status of a policy.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of Validation
 */
export const useValidatePolicyQuery = (
  org: string,
  repo: string,
  id: string
): UseQueryResult<Validation> => {
  const { getValidatePolicy } = useServicesContext();

  return useQuery<Validation>(
    [QueryKey.ValidatePolicy, org, repo, id],
    () => getValidatePolicy(org, repo, id),
    {
      select: (data) => {
        const allErrors2D: string[][] = Object.values(data.errors);
        const allErrors = allErrors2D.reduce(
          (flattenArr, row, i) => flattenArr.concat(row.map((s) => `rule${i + 1}.${s}`)),
          []
        );

        return { status: data.status, errors: allErrors };
      },
      meta: {
        hideDefaultError: true,
      },
    }
  );
};
