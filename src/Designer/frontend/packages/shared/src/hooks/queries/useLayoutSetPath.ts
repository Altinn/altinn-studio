import { usePagesQuery } from '@altinn/ux-editor/hooks/queries/usePagesQuery';

import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';

export const useLayoutSetPath = (org, app, layoutSetId: string) => {
  const { data: pagesModel, isPending: pagesQueryPending } = usePagesQuery(org, app, layoutSetId);

  if (!pagesQueryPending && pagesModel) {
    const page1 = findFirstPage(pagesModel);
    return `/${org}/${app}/ui-editor/layoutSet/${layoutSetId}?layout=${page1}`;
  }

  return `/${org}/${app}/ui-editor/layoutSet/${layoutSetId}`;
};

export const findFirstPage = (pagesModel?: PagesModel): string | undefined => {
  if (!pagesModel) return undefined;
  if (isPagesModelWithGroups(pagesModel)) {
    const firstGroup = pagesModel.groups?.[0];
    return firstGroup?.order?.[0]?.id;
  }
  return pagesModel.pages?.[0]?.id;
};
