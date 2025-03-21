import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useDispatch, useSelector } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IInternalLayout } from '../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { addOrRemoveNavigationButtons } from '../../utils/formLayoutsUtils';
import type { ExternalFormLayoutV3 } from 'app-shared/types/api/FormLayoutsResponseV3';
import { useAddLayoutMutation } from './useAddLayoutMutation';
import { useText } from '../useText';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import { type FormLayoutRequest } from 'app-shared/types/api/FormLayoutRequest';

export const useDeleteLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { deleteFormLayout, saveFormLayoutV3 } = useServicesContext();

  const { data: formLayouts } = useFormLayoutsQuery(org, app, layoutSetName);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, layoutSetName);

  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const addLayoutMutation = useAddLayoutMutation(org, app, layoutSetName);
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const dispatch = useDispatch();
  const t = useText();
  const queryClient = useQueryClient();

  const saveLayout = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: ExternalFormLayoutV3 = internalLayoutToExternal(updatedLayout);
    return await saveFormLayoutV3(org, app, updatedLayoutName, layoutSetName, {
      layout: convertedLayout,
    } as unknown as FormLayoutRequest);
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
    onSuccess: ({ layoutName, layouts }) => {
      const layoutSettings: ILayoutSettings = ObjectUtils.deepCopy(formLayoutSettings);

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
      dispatch(FormLayoutActions.deleteLayoutFulfilled({ layout: layoutName, pageOrder: order }));
    },
  });
};
