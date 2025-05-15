import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateGroupsMutation } from './useUpdateGroupsMutation';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useAppContext } from '../useAppContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';

export const useAddPageToGroup = (pagesModel: PagesModel) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, setSelectedFormLayoutName, updateLayoutsForPreview } =
    useAppContext();
  const updateGroupsMutation = useUpdateGroupsMutation(org, app, selectedFormLayoutSetName);

  const addPageToGroup = (groupIndex: number) => {
    const allPageNames = [
      ...(pagesModel?.pages?.map((page) => page.id) || []),
      ...(pagesModel?.groups?.flatMap((group) => group.order.map((page) => page.id)) || []),
    ];

    let nextNum = allPageNames.length + 1;
    let newLayoutName = `${t('ux_editor.page')}${nextNum}`;

    while (allPageNames.includes(newLayoutName)) {
      nextNum += 1;
      newLayoutName = `${t('ux_editor.page')}${nextNum}`;
    }

    const page: PageModel = { id: newLayoutName };
    const updatedPages = {
      ...pagesModel,
      groups: pagesModel.groups.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            order: [...(group.order || []), page],
          };
        }
        return group;
      }),
    };

    updateGroupsMutation.mutate(updatedPages, {
      onSuccess: async () => {
        setSelectedFormLayoutName(page.id);
        await updateLayoutsForPreview(selectedFormLayoutSetName);
      },
    });
  };
  return { addPageToGroup };
};
