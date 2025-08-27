import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { usePagesQuery } from './queries/usePagesQuery';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';

type UseGetPageByName = {
  layoutSetName: string;
  org: string;
  app: string;
};

type getPageByName = (name: string) => PageModel | undefined;

export const useGetPageByName = ({ layoutSetName, org, app }: UseGetPageByName): getPageByName => {
  const { data: pagesResponse } = usePagesQuery(org, app, layoutSetName);

  return (name) => {
    if (!pagesResponse) return undefined;
    if (isPagesModelWithGroups(pagesResponse)) {
      return pagesResponse.groups.flatMap((group) => group.order).find((page) => page.id === name);
    }
    return pagesResponse?.pages.find((page) => page.id === name);
  };
};
