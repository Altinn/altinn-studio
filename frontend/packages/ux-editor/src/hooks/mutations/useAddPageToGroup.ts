import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateGroupsMutation } from './useUpdateGroupsMutation';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useAppContext } from '../useAppContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { ItemType } from '@altinn/ux-editor/components/Properties/ItemType';

export const useAddPageToGroup = (pagesModel: PagesModel) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const {
    setSelectedItem,
    selectedFormLayoutSetName,
    setSelectedFormLayoutName,
    updateLayoutsForPreview,
  } = useAppContext();
  const updateGroupsMutation = useUpdateGroupsMutation(org, app, selectedFormLayoutSetName);

  const nextValidPageName = () => {
    const allPageNames = [
      ...pagesModel.groups.flatMap((group) => group.order?.map((page) => page.id)),
    ];

    let nextNum = allPageNames.length + 1;
    let newLayoutName = `${t('ux_editor.page')}${nextNum}`;

    while (allPageNames.includes(newLayoutName)) {
      nextNum += 1;
      newLayoutName = `${t('ux_editor.page')}${nextNum}`;
    }
    return newLayoutName;
  };

  const nextValidGroupName = () => {
    const pageGroupPrefix = t('ux_editor.page_layout_group');
    let i: number = 1;
    while (pagesModel.groups.some((group) => group.name === `${pageGroupPrefix} ${i}`)) {
      i++;
    }
    return `${pageGroupPrefix} ${i}`;
  };

  const addPageToGroup = async (groupIndex: number) => {
    const page: PageModel = { id: nextValidPageName() };
    const currentGroup = pagesModel.groups[groupIndex];
    currentGroup.order.push(page);
    if (currentGroup.order.length > 1 && !currentGroup.name) {
      currentGroup.name = nextValidGroupName();
    }

    const updatedPages = {
      ...pagesModel,
    };
    pagesModel.groups.splice(groupIndex, 1, currentGroup);

    await updateGroupsMutation.mutateAsync(updatedPages, {
      onSuccess: async () => {
        setSelectedFormLayoutName(page.id);
        setSelectedItem({ type: ItemType.Page, id: page.id });
        await updateLayoutsForPreview(selectedFormLayoutSetName);
      },
    });
  };
  return { addPageToGroup };
};
