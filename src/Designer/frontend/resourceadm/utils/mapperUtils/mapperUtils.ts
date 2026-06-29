import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { LOCAL_RESOURCE_CHANGED_TIME } from '../../utils/resourceListUtils';

const EnvOrder = ['prod', 'tt02', 'at22', 'at23', 'at24', 'gitea'];

const setLastChangedDate = (resource: ResourceListItem): Date | null => {
  return resource.lastChanged === null && resource.environments.includes('gitea')
    ? LOCAL_RESOURCE_CHANGED_TIME
    : new Date(resource.lastChanged);
};

/**
 * Sets a special last changed date for resources not checked into Gitea and
 * sorts the resource list by date so the newest is at the top.
 *
 * @param resourceList the list to sort
 *
 * @returns the sorted list
 */
export const setLastChangedAndSortResourceListByDate = (
  resourceList: ResourceListItem[],
): ResourceListItem[] => {
  const listWithSortedEnvs = resourceList.map((resource) => {
    return {
      ...resource,
      lastChanged: setLastChangedDate(resource),
      environments: resource.environments.sort((a, b) => EnvOrder.indexOf(a) - EnvOrder.indexOf(b)),
    };
  });
  return listWithSortedEnvs.sort((a, b) => {
    return new Date(b.lastChanged).getTime() - new Date(a.lastChanged).getTime();
  });
};
