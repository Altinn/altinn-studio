import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useAppContext } from '../../../packages/ux-editor/src/hooks';
import { useTranslation } from 'react-i18next';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { changePageGroups } from 'app-shared/api/mutations';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAddGroupMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { getPages } = useServicesContext();
  const { selectedFormLayoutSetName } = useAppContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      const updatedPages = await getPages(org, app, selectedFormLayoutSetName);
      const nextPageNumber = getNextPageNumber(updatedPages.groups, t);
      const newGroup = createNewGroup(updatedPages.groups, nextPageNumber, t);
      const finalPayload = addGroupsWithPages(updatedPages, newGroup);
      return await changePageGroups(org, app, selectedFormLayoutSetName, finalPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.Pages, org, app, selectedFormLayoutSetName],
      });
    },
  });
};

const getNextPageNumber = (groups: GroupModel[], t: (key: string) => string): number => {
  const maxPageNumber = (groups || [])
    ?.flatMap((group) => group.order?.map((page) => page.id) || [])
    .reduce((max, id) => {
      const match = id?.match(new RegExp(`${t('general.page')}(\\d+)`));
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
  return maxPageNumber + 1;
};

const createNewGroup = (
  groups: GroupModel[],
  nextPageNumber: number,
  t: (key: string) => string,
): GroupModel => ({
  name: `${t('general.layout_set')} ${(groups?.length || 0) + 1}`,
  order: [{ id: `${t('general.page')}${nextPageNumber}` }],
});

const addGroupsWithPages = (updatedPages: PagesModel, newGroup: GroupModel): PagesModel => ({
  groups: [...(updatedPages.groups || []), newGroup],
  pages: updatedPages.pages,
});
