import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IFormLayouts } from '../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';

export interface UpdateLayoutNameMutationArgs {
  oldName: string;
  newName: string;
}

export const useUpdateLayoutNameMutation = (org: string, app: string, layoutSetName: string) => {
  const { updateFormLayoutName } = useServicesContext();
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, newName }: UpdateLayoutNameMutationArgs) =>
      updateFormLayoutName(org, app, oldName, newName, layoutSetName).then(() => ({
        oldName,
        newName,
      })),
    onSuccess: ({ oldName, newName }) => {
      dispatch(FormLayoutActions.updateSelectedLayout(newName));
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app, layoutSetName],
        (oldLayouts: IFormLayouts) => {
          const newLayouts = deepCopy(oldLayouts);
          newLayouts[newName] = newLayouts[oldName];
          delete newLayouts[oldName];
          return newLayouts;
        },
      );
      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettingsQuery.data);
      const { order } = layoutSettings?.pages;
      if (order.includes(oldName)) order[order.indexOf(oldName)] = newName;
      if (layoutSettings.receiptLayoutName === oldName) layoutSettings.receiptLayoutName = newName;
      formLayoutSettingsMutation.mutate(layoutSettings);
    },
  });
};
