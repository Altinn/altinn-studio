import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessListMember } from 'app-shared/types/ResourceAdm';

/**
 * Query to get paginated members of access list
 *
 * @param org the organisation of the user
 * @param resourceId the identifier of the resource
 * @param env the chosen environment
 *
 * @returns UseInfiniteQueryResult with a list of access lists members
 */
export const useGetAccessListMembersQuery = (
  org: string,
  accessListId: string,
  env: string,
): UseInfiniteQueryResult<InfiniteData<AccessListMember, string>> => {
  const { getAccessListMembers } = useServicesContext();
  return useInfiniteQuery({
    queryKey: [QueryKey.AccessListMembers, org, env, accessListId],
    queryFn: ({ pageParam }) => getAccessListMembers(org, accessListId, env, pageParam),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!org && !!env && !!accessListId,
    select: (data) => ({
      ...data,
      pages: data.pages.flatMap((page) => page.data),
    }),
  });
};
