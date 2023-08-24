import type { ResourceListItem } from "app-shared/types/ResourceAdm";

/**
 * Maps a string from the format sent from backend, e.g.,
 * '2023-06-14T13:35:00+02:00' to dd.mm.yyyy.
 *
 * @param dateString the string to map
 *
 * @returns a formatted date
 */
const formatDateFromBackendToDDMMYYYY = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString().replaceAll("/", ".");
};

/**
 * Sorts a resource list by the date so the newest is at the top, then maps
 * the object correctly.
 *
 * @param resourceList the list to sort and map
 *
 * @returns the sorted and mapped list
 */
export const sortResourceListByDateAndMap = (
  resourceList: ResourceListItem[]
): ResourceListItem[] => {
  const sorted = resourceList.sort((a, b) => {
    return (
      new Date(b.lastChanged).getTime() - new Date(a.lastChanged).getTime()
    );
  });

  return sorted.map((r) => ({
    ...r,
    lastChanged: formatDateFromBackendToDDMMYYYY(r.lastChanged),
  }));
};
