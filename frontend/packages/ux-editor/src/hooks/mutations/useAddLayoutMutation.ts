import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import { convertInternalToLayoutFormat, createEmptyLayout } from '../../utils/formLayoutUtils';
import { IExternalFormLayout, IInternalLayout } from '../../types/global';
import {
  queryClient,
  useServicesContext,
} from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ILayoutSettings } from 'app-shared/types/global';
import { addOrRemoveNavigationButtons } from '../../utils/formLayoutsUtils';

export interface AddLayoutMutationArgs {
  layoutName: string;
  isReceiptPage?: boolean;
}

export const useAddLayoutMutation = (org: string, app: string) => {
  const { saveFormLayout } = useServicesContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app);
  const dispatch = useDispatch();

  const save = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: IExternalFormLayout = convertInternalToLayoutFormat(updatedLayout);
    return await saveFormLayout(org, app, updatedLayoutName, convertedLayout);
  };

  return useMutation({
    mutationFn: async ({ layoutName, isReceiptPage }: AddLayoutMutationArgs) => {
      const layoutSettings: ILayoutSettings = formLayoutSettingsQuery.data;
      const layouts = formLayoutsQuery.data;

      if (Object.keys(layouts).indexOf(layoutName) !== -1) throw Error('Layout already exists');
      let newLayouts = deepCopy(layouts);

      newLayouts[layoutName] = createEmptyLayout();
      newLayouts = await addOrRemoveNavigationButtons(
        newLayouts,
        save,
        layoutName,
        isReceiptPage ? layoutName : layoutSettings.receiptLayoutName
      );
      return { newLayouts, layoutName, isReceiptPage };
    },

    onSuccess: async ({ newLayouts, layoutName, isReceiptPage }) => {
      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettingsQuery.data);
      const { order } = layoutSettings?.pages;

      if (isReceiptPage) layoutSettings.receiptLayoutName = layoutName;
      else order.push(layoutName);

      await formLayoutSettingsMutation.mutateAsync(layoutSettings);
      dispatch(
        FormLayoutActions.addLayoutFulfilled({
          layoutOrder: order,
          receiptLayoutName: layoutSettings.receiptLayoutName,
        })
      );

      queryClient.setQueryData([QueryKey.FormLayouts, org, app], () => newLayouts);
    },
  });
};
