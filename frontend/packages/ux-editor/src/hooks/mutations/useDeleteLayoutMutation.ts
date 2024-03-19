import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IInternalLayout } from '../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { addOrRemoveNavigationButtons, firstAvailableLayout } from '../../utils/formLayoutsUtils';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { useAddLayoutMutation } from './useAddLayoutMutation';
import { useText } from '../useText';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import { useAppContext } from '../../hooks/useAppContext';
import { useSearchParams } from 'react-router-dom';

export const useDeleteLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { deleteFormLayout, saveFormLayout } = useServicesContext();

  const { data: formLayouts } = useFormLayoutsQuery(org, app, layoutSetName);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const { selectedLayout, refetchLayouts, refetchLayoutSettings, reloadPreview } = useAppContext();
  const [, setSearchParams] = useSearchParams();

  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const addLayoutMutation = useAddLayoutMutation(org, app, layoutSetName);
  const t = useText();
  const queryClient = useQueryClient();
  const layoutOrder = formLayoutSettings?.pages?.order;

  const saveLayout = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: ExternalFormLayout = internalLayoutToExternal(updatedLayout);
    return await saveFormLayout(org, app, updatedLayoutName, layoutSetName, convertedLayout);
  };

  return useMutation({
    mutationFn: async (layoutName: string) => {
      let layouts = deepCopy(formLayouts);
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
      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettings);

      const { order } = layoutSettings?.pages;

      if (order.includes(layoutName)) {
        order.splice(order.indexOf(layoutName), 1);
      }
      if (layoutSettings.receiptLayoutName === layoutName) {
        layoutSettings.receiptLayoutName = undefined;
      }
      formLayoutSettingsMutation.mutate(layoutSettings);

      const layoutPagesOrder = formLayoutSettings?.pages.order;

      // Make sure to create a new page when the last one is deleted!
      if (!selectedLayout && layoutPagesOrder.length === 0) {
        const layoutName = t('general.page') + (layoutPagesOrder.length + 1);
        addLayoutMutation.mutate({ layoutName, isReceiptPage: false });
      }

      queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], () => layouts);

      const layoutToSelect = firstAvailableLayout(layoutName, layoutOrder);
      if (selectedLayout === layoutName) {
        setSearchParams((prevParams) => ({ ...prevParams, layout: layoutToSelect }));
      } else {
        await refetchLayouts();
        await refetchLayoutSettings();
        reloadPreview(layoutToSelect);
      }
    },
  });
};
