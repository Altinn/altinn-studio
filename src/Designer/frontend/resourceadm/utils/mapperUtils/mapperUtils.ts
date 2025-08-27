import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { LOCAL_RESOURCE_CHANGED_TIME } from '../resourceListUtils';

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

/**
 * Maps an Altinn2LinkService object to an object with value and label to be
 * used for a Select option.
 *
 * @param ls the link service from Altinn 2
 *
 * @returns an object that looks like this: { value: string, label: string }
 */
export const mapAltinn2LinkServiceToSelectOption = (ls: Altinn2LinkService) => {
  return {
    value: JSON.stringify(ls),
    label: `${ls.serviceName} (${ls.externalServiceCode}/${ls.externalServiceEditionCode})`,
  };
};

/**
 * Maps a link service option string back to Altinn2LinkService object
 *
 * @param selectOption JSON string of Altinn2LinkService
 *
 * @returns a Altinn2LinkService object
 */
export const mapSelectOptiontoAltinn2LinkService = (selectOption: string): Altinn2LinkService => {
  return JSON.parse(selectOption);
};
