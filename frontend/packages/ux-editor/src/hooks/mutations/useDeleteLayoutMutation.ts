import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IInternalLayout } from '../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { addOrRemoveNavigationButtons, firstAvailableLayout } from '../../utils/formLayoutsUtils';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import { useAppContext } from '../';

export const useDeleteLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { deleteFormLayout, saveFormLayout } = useServicesContext();

  const { data: formLayouts } = useFormLayoutsQuery(org, app, layoutSetName);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const { selectedFormLayoutName, setSelectedFormLayoutName } = useAppContext();

  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const queryClient = useQueryClient();
  const layoutOrder = formLayoutSettings?.pages?.order;

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
      layouts = await addOrRemoveNavigationButtons(
        layouts,
        saveLayout,
        undefined,
        formLayoutSettings.receiptLayoutName,
      );
      await deleteFormLayout(org, app, layoutName, layoutSetName);
      return { layoutName, layouts };
    },
    onSuccess: async ({ layoutName, layouts }) => {
      const layoutSettings: ILayoutSettings = ObjectUtils.deepCopy(formLayoutSettings);
      const { order } = layoutSettings?.pages;

      if (order.includes(layoutName)) {
        order.splice(order.indexOf(layoutName), 1);
      }
      if (layoutSettings.receiptLayoutName === layoutName) {
        layoutSettings.receiptLayoutName = undefined;
      }
      formLayoutSettingsMutation.mutate(layoutSettings);

      queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], () => layouts);

      const layoutToSelect = firstAvailableLayout(layoutName, layoutOrder);
      if (selectedFormLayoutName === layoutName) {
        setSelectedFormLayoutName(layoutToSelect);
      }
    },
  });
};
