import { useMutation } from '@tanstack/react-query';
import {
  queryClient,
  useServicesContext,
} from '../../../../../app-development/common/ServiceContext';
import { useDispatch } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { QueryKey } from '../../types/QueryKey';
import { IExternalFormLayout, IInternalLayout } from '../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ILayoutSettings } from 'app-shared/types/global';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { addOrRemoveNavigationButtons } from '../../utils/formLayoutsUtils';
import { convertInternalToLayoutFormat } from '../../utils/formLayoutUtils';

export const useDeleteLayoutMutation = (org: string, app: string) => {
  const { deleteFormLayout, saveFormLayout } = useServicesContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app);
  const dispatch = useDispatch();

  const saveLayout = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: IExternalFormLayout = convertInternalToLayoutFormat(updatedLayout);
    return await saveFormLayout(org, app, updatedLayoutName, convertedLayout);
  };

  return useMutation({
    mutationFn: async (layoutName: string) => {
      let layouts = deepCopy(formLayouts);
      delete layouts[layoutName];
      layouts = await addOrRemoveNavigationButtons(
        layouts,
        saveLayout,
        undefined,
        formLayoutSettings.receiptLayoutName
      );
      await deleteFormLayout(org, app, layoutName);
      return { layoutName, layouts };
    },
    onSuccess: ({ layoutName, layouts }) => {
      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettings);

      const { order } = layoutSettings?.pages;

      if (order.includes(layoutName)) {
        order.splice(order.indexOf(layoutName), 1);
      }
      if (layoutSettings.receiptLayoutName === layoutName) {
        layoutSettings.receiptLayoutName = undefined;
      }
      formLayoutSettingsMutation.mutate(layoutSettings);

      queryClient.setQueryData([QueryKey.FormLayouts, org, app], () => layouts);
      dispatch(FormLayoutActions.deleteLayoutFulfilled({ layout: layoutName, pageOrder: order }));
    },
  });
};
