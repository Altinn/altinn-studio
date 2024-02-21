import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the list of access lists (without members)
 *
 * @param org the organisation of the user
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a list of access lists and url to next page
 */
export const useGetAccessListsQuery = (
  org: string,
  env: string,
): UseInfiniteQueryResult<InfiniteData<AccessList, number>> => {
  const { getAccessLists } = useServicesContext();

  return useInfiniteQuery({
    queryKey: [QueryKey.AccessLists, env],
    queryFn: ({ pageParam }) => getAccessLists(org, env, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!org && !!env,
    select: (data) => ({
      ...data,
      pages: data.pages.flatMap((page) => page.data),
    }),
  });
};
