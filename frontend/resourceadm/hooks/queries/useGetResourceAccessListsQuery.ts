import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get all access lists connected to a resource
 *
 * @param org the organisation of the user
 * @param resourceId the identifier of the resource
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a list of access lists
 */
export const useGetResourceAccessListsQuery = (
  org: string,
  resourceId: string,
  env: string,
): UseInfiniteQueryResult<InfiniteData<AccessList, number>> => {
  const { getResourceAccessLists } = useServicesContext();

  return useInfiniteQuery({
    queryKey: [QueryKey.ResourceAccessLists, resourceId, env],
    queryFn: ({ pageParam }) => getResourceAccessLists(org, resourceId, env, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!org && !!env && !!resourceId,
    select: (data) => ({
      ...data,
      pages: data.pages.flatMap((page) => page.data),
    }),
  });
};
