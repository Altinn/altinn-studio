import type { GroupModel, PageModel } from './PageModel';
import type { TaskNavigationGroup } from './TaskNavigationGroup';

export type PagesModelWithPageGroups = {
  groups: GroupModel[];
};

export type PagesModelWithPageOrder = {
  pages: PageModel[];
};

export const isPagesModelWithGroups = (model: PagesModel): model is PagesModelWithPageGroups => {
  return 'groups' in model;
};

export type PagesModel = {
  pdfLayoutName?: string;
  hideCloseButton?: boolean;
  showLanguageSelector?: boolean;
  showExpandWidthButton?: boolean;
  expandedWidth?: boolean;
  showProgress?: boolean;
  autoSaveBehaviour?: string;
  taskNavigation?: TaskNavigationGroup[];
  excludeFromPdf?: string[];
} & (PagesModelWithPageGroups | PagesModelWithPageOrder);
