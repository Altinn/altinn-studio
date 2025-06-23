import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import { t } from 'i18next';

export const movePageToGroup = (
  groups: GroupModel[],
  pageName: string,
  newGroupIndex: number,
): GroupModel[] => {
  return removePageFromGroups(groups, pageName).map((group, index) =>
    index === newGroupIndex ? { ...group, order: [...group.order, { id: pageName }] } : group,
  );
};

export const removePageFromGroups = (groups: GroupModel[], pageName: string): GroupModel[] => {
  return groups.map((group) => ({
    ...group,
    order: group.order.filter((page) => page.id !== pageName),
  }));
};

export const updateGroupNames = (groups: GroupModel[]): GroupModel[] => {
  return groups.map((group) => {
    if (group.name === undefined && group.order.length > 1) {
      return { ...group, name: getNextValidGroupName(groups) };
    }
    if (group.name !== undefined && group.order.length < 2) {
      return { ...group, name: undefined };
    }
    return group;
  });
};

export const removeEmptyGroups = (groups: GroupModel[]): GroupModel[] => {
  return groups.filter((group) => group.order.length > 0);
};

export const getNextValidGroupName = (groups: GroupModel[]): string => {
  const pageGroupPrefix = t('ux_editor.page_layout_group');
  let i = 1;
  while (groups.some((group) => group.name === `${pageGroupPrefix} ${i}`)) {
    i++;
  }
  return `${pageGroupPrefix} ${i}`;
};
