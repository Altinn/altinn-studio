import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateGroupsMutation } from './useUpdateGroupsMutation';
import type { PagesModelWithPageGroups } from 'app-shared/types/api/dto/PagesModel';
import { useAppContext } from '../useAppContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { ItemType } from '@altinn/ux-editor/components/Properties/ItemType';
import useUxEditorParams from '../useUxEditorParams';

export const useAddPageToGroup = (pagesModel: PagesModelWithPageGroups) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { setSelectedItem, setSelectedFormLayoutName, updateLayoutsForPreview } = useAppContext();
  const { layoutSet } = useUxEditorParams();

  const updateGroupsMutation = useUpdateGroupsMutation(org, app, layoutSet);

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
    const newPage: PageModel = { id: nextValidPageName() };
    const updatedGroups = [...pagesModel.groups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      order: [...updatedGroups[groupIndex].order, newPage],
      name: updatedGroups[groupIndex].name || nextValidGroupName(),
    };

    await updateGroupsMutation.mutateAsync(
      { ...pagesModel, groups: updatedGroups },
      {
        onSuccess: async () => {
          setSelectedFormLayoutName(newPage.id);
          setSelectedItem({ type: ItemType.Page, id: newPage.id });
          await updateLayoutsForPreview(layoutSet);
        },
      },
    );
  };
  return { addPageToGroup };
};
