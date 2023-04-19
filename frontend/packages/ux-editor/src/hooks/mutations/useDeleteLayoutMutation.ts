import { useMutation } from '@tanstack/react-query';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { useDispatch } from 'react-redux';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { ComponentType } from '../../components';
import { useDeleteFormComponentsMutation } from './useDeleteFormComponentsMutation';
import { QueryKey } from '../../types/QueryKey';
import { IFormLayouts } from '../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ILayoutSettings } from 'app-shared/types/global';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';

export interface DeleteLayoutMutationArgs {
  layoutName: string;
  isReceiptPage?: boolean;
}

export const useDeleteLayoutMutation = (org: string, app: string) => {
  const { deleteFormLayout } = useServicesContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app);
  const deleteFormComponentsMutation = useDeleteFormComponentsMutation(org, app);
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: async ({ layoutName, isReceiptPage }: DeleteLayoutMutationArgs) => {
      await deleteFormLayout(org, app, layoutName);
      return { layoutName, isReceiptPage };
    },
    onSuccess: ({ layoutName, isReceiptPage }) => {
      const layouts = formLayoutsQuery.data;
      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettingsQuery.data);

      const { order } = layoutSettings?.pages;
      const lastPageKey = layoutName === order[0] ? order[1] : order[0];
      const lastPage = layouts[lastPageKey];
      const secondLastPageIsBeingDeleted = Object.keys(layouts).length === 2;

      if (order.includes(layoutName)) {
        order.splice(order.indexOf(layoutName), 1);
      }
      if (layoutSettings.receiptLayoutName === layoutName) {
        layoutSettings.receiptLayoutName = undefined;
      }
      formLayoutSettingsMutation.mutate(layoutSettings);

      if (secondLastPageIsBeingDeleted && !isReceiptPage) {
        const hasNavigationButton = Object.keys(layouts[lastPageKey].components).some(
          (component: string) => lastPage.components[component].type === ComponentType.NavigationButtons
        );
        if (hasNavigationButton) {
          const navigationButtonComponent = Object.keys(lastPage.components).find(
            (component: string) => lastPage.components[component].type === ComponentType.NavigationButtons
          );
          dispatch(FormLayoutActions.updateSelectedLayout(lastPageKey));
          const componentsToDelete = [lastPage.components[navigationButtonComponent].id];
          deleteFormComponentsMutation.mutate(componentsToDelete);
          dispatch(FormLayoutActions.updateSelectedLayout(layoutName));
        }
      }

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldLayouts: IFormLayouts) => {
          const newLayouts = deepCopy(oldLayouts);
          delete newLayouts[layoutName];
          return newLayouts;
        }
      );
      dispatch(FormLayoutActions.deleteLayoutFulfilled({ layout: layoutName, pageOrder: order }));
    }
  });
};
