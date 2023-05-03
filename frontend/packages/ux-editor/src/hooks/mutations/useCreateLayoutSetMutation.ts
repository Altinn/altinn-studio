import { useLayoutSetsQuery } from '../queries/useFormLayoutsQuery';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import {IExternalFormLayout, IInternalLayout, ILayoutSetConfig, ILayoutSets} from '../../types/global';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ILayoutSettings } from 'app-shared/types/global';
import { addOrRemoveNavigationButtons } from '../../utils/formLayoutsUtils';

export const useAddLayoutMutation = (org: string, app: string) => {
  const { addLayoutSet } = useServicesContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app);
  const dispatch = useDispatch();

  const add = async () => {
    const layoutSet: ILayoutSetConfig = convertInternalToLayoutFormat(updatedLayout);
    return await addLayoutSet(org, app, layoutSet);
  };

  return useMutation({

    mutationFn: async ({ layoutName, isReceiptPage }: AddLayoutMutationArgs) => {
      const layouts = formLayoutsQuery.data;

      if (Object.keys(layouts).indexOf(layoutName) !== -1) throw Error('Layout already exists');
      let newLayouts = deepCopy(layouts);

      newLayouts[layoutName] = createEmptyLayout();
      newLayouts = await addOrRemoveNavigationButtons(newLayouts, save, layoutName);
      return { newLayouts, layoutName, isReceiptPage };
    },

    onSuccess: async ({ newLayouts, layoutName, isReceiptPage }) => {

      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettingsQuery.data);
      const { order } = layoutSettings?.pages;

      if (isReceiptPage) layoutSettings.receiptLayoutName = layoutName;
      order.push(layoutName);

      await formLayoutSettingsMutation.mutateAsync(layoutSettings);
      dispatch(FormLayoutActions.addLayoutFulfilled(order));

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        () => newLayouts
      );
    }
  });
}
