import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';

export const findFirstPage = (pagesModel?: PagesModel): string | undefined => {
  if (!pagesModel) return undefined;
  if (isPagesModelWithGroups(pagesModel)) {
    const firstGroup = pagesModel.groups?.[0];
    return firstGroup?.order?.[0]?.id;
  }
  return pagesModel.pages?.[0]?.id;
};
