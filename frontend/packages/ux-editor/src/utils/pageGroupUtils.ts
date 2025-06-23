import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import { t } from 'i18next';

export class PageGroupUtils {
  groups: GroupModel[];

  public constructor(groups: GroupModel[]) {
    this.groups = [...groups];
  }

  public movePageToGroup = (pageName: string, newGroupIndex: number): this => {
    this.removePageFromGroups(pageName);
    this.groups = this.groups.map((group, index) => {
      if (index === newGroupIndex) {
        return { ...group, order: [...group.order, { id: pageName }] };
      }
      return group;
    });
    return this;
  };

  public removePageFromGroups = (pageName: string): this => {
    this.groups = this.groups.map((group) => ({
      ...group,
      order: group.order.filter((page) => page.id !== pageName),
    }));
    return this;
  };

  public updateGroupNames = (): this => {
    this.groups = this.groups.map((group, index) => {
      if (group.name === undefined && group.order.length > 1) {
        return { ...group, name: this.getNextValidGroupName() };
      }
      if (group.name !== undefined && group.order.length < 2) {
        return { ...group, name: undefined };
      }
      return group;
    });
    return this;
  };

  public removeEmptyGroups = (): this => {
    this.groups = this.groups.filter((group) => group.order.length > 0);
    return this;
  };

  public getNextValidGroupName = (): string => {
    const pageGroupPrefix = t('ux_editor.page_layout_group');
    let i: number = 1;
    while (this.groups.some((group) => group.name === `${pageGroupPrefix} ${i}`)) {
      i++;
    }
    return `${pageGroupPrefix} ${i}`;
  };
}
