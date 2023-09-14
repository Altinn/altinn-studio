import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to publish a resource
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 * @param env the environment
 *
 * @returns UseQueryResult with the status code
 */
export const usePublishResource = (
  org: string,
  repo: string,
  id: string,
  env: string
): UseQueryResult<number> => {
  const { getPublishResource } = useServicesContext();

  return useQuery<number>(
    [QueryKey.PublishResource, org, repo, id, env],
    () => getPublishResource(org, repo, id, env),
    {
      select: (data) => {
        console.log(data);
        return data;
      },
    }
  );
};
