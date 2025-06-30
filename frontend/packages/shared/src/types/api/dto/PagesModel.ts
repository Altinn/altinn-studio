import type { GroupModel, PageModel } from './PageModel';

export type PagesModelWithPageGroups = {
  groups: GroupModel[];
};

export type PagesModelWithPageOrder = {
  pages: PageModel[];
};

export const isPagesModelWithGroups = (model: PagesModel): model is PagesModelWithPageGroups => {
  return 'groups' in model;
};

export type PagesModel = PagesModelWithPageGroups | PagesModelWithPageOrder;
