import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { sortResourceListByDateAndMap } from 'resourceadm/utils/mapperUtils';

/**
 * Query to get the list of resources. It maps the date to correct display format
 * and sorts the list before it is being returned.
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of resources of Resource
 */
export const useGetResourceListQuery = (org: string): UseQueryResult<ResourceListItem[]> => {
  const { getResourceList } = useServicesContext();

  return useQuery<ResourceListItem[]>([QueryKey.ResourceList, org], () => getResourceList(org), {
    select: (data) => data && sortResourceListByDateAndMap(data),
  });
};
