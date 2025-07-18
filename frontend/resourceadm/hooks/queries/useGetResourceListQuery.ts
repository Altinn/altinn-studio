import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { setLastChangedAndSortResourceListByDate } from '../../utils/mapperUtils';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

/**
 * Query to get the list of resources. It maps the date to correct display format
 * and sorts the list before it is being returned. For resources not checked into
 * Gitea, it sets a special last changed date to prioritize them in the sorted list.
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of resources of Resource
 */
export const useGetResourceListQuery = (
  org: string,
  disabled?: boolean,
): UseQueryResult<ResourceListItem[]> => {
  const { getResourceList } = useServicesContext();

  const useNewApi = shouldDisplayFeature(FeatureFlag.ResourceListNewApi);
  return useQuery<ResourceListItem[]>({
    queryKey: [QueryKey.ResourceList, org],
    queryFn: () => getResourceList(org, useNewApi),
    select: (resourceListItems: ResourceListItem[]) =>
      resourceListItems && setLastChangedAndSortResourceListByDate(resourceListItems),
    enabled: !disabled,
  });
};
