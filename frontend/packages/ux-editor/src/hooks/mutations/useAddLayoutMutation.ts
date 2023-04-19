import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import { convertFromLayoutToInternalFormat } from '../../utils/formLayout';
import { ComponentType } from '../../components';
import { generateComponentId } from '../../utils/generateId';
import { IExternalFormLayout, IFormButtonComponent, IInternalLayout } from '../../types/global';
import { useAddFormComponentMutation } from './useAddFormComponentMutation';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';
import { QueryKey } from '../../types/QueryKey';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ILayoutSettings } from 'app-shared/types/global';

export interface AddLayoutMutationArgs {
  layoutName: string;
  isReceiptPage?: boolean;
}

export const useAddLayoutMutation = (org: string, app: string) => {
  const { saveFormLayout } = useServicesContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const addFormComponentMutation = useAddFormComponentMutation(org, app);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app);
  const dispatch = useDispatch();

  return useMutation({

    mutationFn: async ({ layoutName, isReceiptPage }: AddLayoutMutationArgs) => {
      const layouts = formLayoutsQuery.data;

      if (Object.keys(layouts).indexOf(layoutName) !== -1) throw Error('Layout already exists');
      const newLayouts = deepCopy(layouts);

      const newLayout: IInternalLayout = convertFromLayoutToInternalFormat([], false);
      const externalFormLayout: IExternalFormLayout = {
        $schema: layoutSchemaUrl(),
        data: { layout: [], hidden: false, },
      };
      await saveFormLayout(org, app, layoutName, externalFormLayout);
      newLayouts[layoutName] = newLayout;
      return { newLayouts, layoutName, isReceiptPage };
    },

    onSuccess: async ({ newLayouts, layoutName, isReceiptPage }) => {

      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettingsQuery.data);
      const { order } = layoutSettings?.pages;

      if (isReceiptPage) layoutSettings.receiptLayoutName = layoutName;
      order.push(layoutName);

      await formLayoutSettingsMutation.mutateAsync(layoutSettings);
      dispatch(FormLayoutActions.addLayoutFulfilled(order));

      const firstPageKey = order[0];
      const firstPage = newLayouts[firstPageKey];
      const hasFirstPage = Object.keys(newLayouts).length > 1;

      if (hasFirstPage && !isReceiptPage) {
        const navigationButtonComponent: IFormButtonComponent = {
          itemType: 'COMPONENT',
          componentType: ComponentType.NavigationButtons,
          dataModelBindings: {},
          id: '',
          onClickAction: () => {},
          showBackButton: true,
          textResourceBindings: { next: 'next', back: 'back', },
          type: ComponentType.NavigationButtons,
        };

        if (firstPage && firstPage.components) {
          const hasNavigationButton = Object.keys(firstPage.components).some(
            (component: string) => firstPage.components[component].type === ComponentType.NavigationButtons
          );
          if (!hasNavigationButton) {
            dispatch(FormLayoutActions.updateSelectedLayout(firstPageKey));
            await addFormComponentMutation.mutateAsync({
              component: {
                ...navigationButtonComponent,
                id: generateComponentId(navigationButtonComponent.type, newLayouts),
              },
              position: Object.keys(newLayouts[firstPageKey].components).length,
              containerId: Object.keys(newLayouts[firstPageKey].containers)[0],
            });
          }
        }

        dispatch(FormLayoutActions.updateSelectedLayout(layoutName));
        await addFormComponentMutation.mutateAsync({
          component: {
            ...navigationButtonComponent,
            id: generateComponentId(navigationButtonComponent.type, newLayouts),
          },
          position: 0,
          containerId: Object.keys(newLayouts[layoutName].containers)[0],
        });
      }

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        () => newLayouts
      );
    }
  });
}
