import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useDispatch } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import { createEmptyLayout } from '../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../types/global';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';
import { addOrRemoveNavigationButtons } from '../../utils/formLayoutsUtils';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';

export interface AddLayoutMutationArgs {
  layoutName: string;
  isReceiptPage?: boolean;
}

export const useAddLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { saveFormLayout } = useServicesContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app, layoutSetName);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const save = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: ExternalFormLayout = internalLayoutToExternal(updatedLayout);
    return await saveFormLayout(org, app, updatedLayoutName, layoutSetName, convertedLayout);
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
        isReceiptPage ? layoutName : layoutSettings.receiptLayoutName,
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
          receiptLayoutName: isReceiptPage ? layoutSettings.receiptLayoutName : undefined,
        }),
      );

      queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], () => newLayouts);
    },
  });
};
