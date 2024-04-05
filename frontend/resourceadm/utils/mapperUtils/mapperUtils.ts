import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

/**
 * Sorts a resource list by the date so the newest is at the top
 *
 * @param resourceList the list to sort
 *
 * @returns the sorted list
 */
export const sortResourceListByDate = (resourceList: ResourceListItem[]): ResourceListItem[] => {
  return resourceList.sort((a, b) => {
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
  return linkServices.map((ls: Altinn2LinkService) => ({
    value: JSON.stringify(ls),
    label: `${ls.externalServiceCode}-${ls.externalServiceEditionCode}-${ls.serviceName}`,
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
