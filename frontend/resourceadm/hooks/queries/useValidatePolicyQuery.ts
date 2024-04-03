import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Validation } from 'app-shared/types/ResourceAdm';
import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

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
  id: string,
): UseQueryResult<Validation, AxiosError> => {
  const { getValidatePolicy } = useServicesContext();

  return useQuery<Validation, AxiosError>({
    queryKey: [QueryKey.ValidatePolicy, org, repo, id],
    queryFn: () => getValidatePolicy(org, repo, id),
    select: (data) => {
      const errorsArray: string[][] = Object.values(data.errors);
      let allErrors: string[] = [];

      const hasErrors = errorsArray.length > 1;
      if (hasErrors) {
        allErrors = errorsArray.reduce(
          (flattenArr, row, i) => flattenArr.concat(row.map((s) => `rule${i + 1}.${s}`)),
          [],
        );
      } else {
        allErrors = errorsArray.flat(1).map((row) => {
          return `${data.status === ServerCodes.NotFound ? '' : 'rule1.'}${row}`;
        });
      }

      return { status: data.status, errors: allErrors };
    },
  });
};
