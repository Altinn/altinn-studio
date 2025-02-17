import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

export const LOCAL_RESOURCE_CHANGED_TIME = new Date('9999-12-31');

/**
 * Filter the list based on what is typed in the search box
 */
export const filterTableData = (
  searchValue: string,
  list: ResourceListItem[],
): ResourceListItem[] => {
  const searchValueLower = searchValue.toLocaleLowerCase();

  return list.filter((resource: ResourceListItem) => {
    const titles = Object.values(resource.title).map((title) => title.toLocaleLowerCase());
    return titles.some((titleLower) => titleLower.includes(searchValueLower));
  });
};
