import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

export const LOCAL_RESOURCE_CHANGED_TIME = new Date('9999-12-31');

const INACTIVE_RESOURCE_STATUSES: ReadonlyArray<string> = [
  'deprecated',
  'withdrawn',
  'discontinued',
];

/**
 * A resource is inactive when its status is Deprecated, Withdrawn or Discontinued.
 * Resources with any other status, or without a status, are treated as active.
 */
export const isResourceInactive = (resource: ResourceListItem): boolean => {
  const statusLower = resource.status?.toLocaleLowerCase();
  return !!statusLower && INACTIVE_RESOURCE_STATUSES.includes(statusLower);
};

const matchesSearchValue = (resource: ResourceListItem, searchValueLower: string): boolean => {
  if (!searchValueLower) {
    return true;
  }
  const titles = Object.values(resource.title ?? {}).map((title) => title.toLocaleLowerCase());
  const isTitleMatch = titles.some((titleLower) => titleLower.includes(searchValueLower));
  const isIdMatch = resource.identifier.toLocaleLowerCase().includes(searchValueLower);
  return isTitleMatch || isIdMatch;
};

/**
 * Filter the list based on what is typed in the search box, and hide inactive resources unless showInactive is set
 */
export const filterTableData = (
  searchValue: string,
  list: ResourceListItem[],
  showInactive: boolean,
): ResourceListItem[] => {
  const searchValueLower = searchValue.toLocaleLowerCase();

  return list.filter(
    (resource: ResourceListItem) =>
      (showInactive || !isResourceInactive(resource)) &&
      matchesSearchValue(resource, searchValueLower),
  );
};
