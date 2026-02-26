import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useTranslation } from 'react-i18next';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import {
  isPagesModelWithGroups,
  type PagesModelWithPageGroups,
} from 'app-shared/types/api/dto/PagesModel';

import { QueryKey } from 'app-shared/types/QueryKey';
import useUxEditorParams from '../useUxEditorParams';

export const useAddGroupMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { getPages, changePageGroups } = useServicesContext();
  const { layoutSet } = useUxEditorParams();

  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      const updatedPages = await getPages(org, app, layoutSet);
      if (!isPagesModelWithGroups(updatedPages))
        throw new Error('Pages model does not contain groups');
      const nextPageNumber = getNextPageNumber(updatedPages.groups, t);
      const newGroup = createNewGroup(nextPageNumber, t);
      const finalPayload = addGroupsWithPages(updatedPages, newGroup);
      return await changePageGroups(org, app, layoutSet, finalPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Pages, org, app, layoutSet],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayouts, org, app, layoutSet],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSet],
      });
    },
  });
};

const getNextPageNumber = (groups: GroupModel[], t: (key: string) => string): number => {
  const maxPageNumber = (groups || [])
    ?.flatMap((group) => group.order?.map((page) => page.id) || [])
    .reduce((max, id) => {
      const match = id?.match(new RegExp(`${t('general.page')}(\\d+)`));
      return match && !isNaN(parseInt(match[1])) ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
  return maxPageNumber + 1;
};

const createNewGroup = (nextPageNumber: number, t: (key: string) => string): GroupModel => ({
  order: [{ id: `${t('general.page')}${nextPageNumber}` }],
});

const addGroupsWithPages = (
  updatedPages: PagesModelWithPageGroups,
  newGroup: GroupModel,
): PagesModelWithPageGroups => ({
  ...updatedPages,
  groups: [...(updatedPages.groups || []), newGroup],
});
