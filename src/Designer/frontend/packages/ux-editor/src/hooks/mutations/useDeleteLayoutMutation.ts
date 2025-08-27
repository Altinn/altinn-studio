import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IInternalLayout } from '../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { addOrRemoveNavigationButtons, firstAvailableLayout } from '../../utils/formLayoutsUtils';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import { useAppContext } from '../index';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';

export const useDeleteLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { deleteFormLayout, saveFormLayout } = useServicesContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, layoutSetName);
  const layoutSettings = useSavableFormLayoutSettings();
  const { selectedFormLayoutName, setSelectedFormLayoutName } = useAppContext();

  const queryClient = useQueryClient();

  const saveLayout = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: ExternalFormLayout = internalLayoutToExternal(updatedLayout);
    return await saveFormLayout(org, app, updatedLayoutName, layoutSetName, {
      layout: convertedLayout,
    });
  };

  return useMutation({
    mutationFn: async (layoutName: string) => {
      let layouts = ObjectUtils.deepCopy(formLayouts);
      delete layouts[layoutName];
      layouts = await addOrRemoveNavigationButtons(layouts, saveLayout);
      await deleteFormLayout(org, app, layoutName, layoutSetName);
      return { layoutName, layouts };
    },
    onSuccess: ({ layoutName, layouts }) => {
      layoutSettings.deleteLayoutByName(layoutName);
      layoutSettings.save();

      queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], () => layouts);

      if (selectedFormLayoutName === layoutName) {
        const layoutToSelect = firstAvailableLayout(layoutName, layoutSettings.getLayoutsOrder());
        setSelectedFormLayoutName(layoutToSelect);
      }
    },
  });
};
