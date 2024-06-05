import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

const EnvOrder = ['prod', 'tt02', 'at21', 'at22', 'at23', 'at24', 'gitea'];
/**
 * Sorts a resource list by the date so the newest is at the top
 *
 * @param resourceList the list to sort
 *
 * @returns the sorted list
 */
export const sortResourceListByDate = (resourceList: ResourceListItem[]): ResourceListItem[] => {
  const listWithSortedEnvs = resourceList.map((resource) => {
    return {
      ...resource,
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
 * @param linkServices the list of link services from Altinn 2
 *
 * @returns an object that looks like this: { value: string, label: string }
 */
export const mapAltinn2LinkServiceToSelectOption = (linkServices: Altinn2LinkService[]) => {
  const sortedServices = [...linkServices].sort((a, b) => {
    const serviceOwnerValue = a.serviceOwnerCode.localeCompare(b.serviceOwnerCode);
    return serviceOwnerValue === 0
      ? a.externalServiceCode.localeCompare(b.externalServiceCode)
      : serviceOwnerValue;
  });
  return sortedServices.map((ls: Altinn2LinkService) => ({
    value: JSON.stringify(ls),
    label: `${ls.serviceOwnerCode}: ${ls.externalServiceCode}-${ls.externalServiceEditionCode}-${ls.serviceName}`,
  }));
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
