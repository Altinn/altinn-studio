import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { QueryKey } from '../../types/QueryKey';
import { IFormLayouts } from '../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { ILayoutSettings } from 'app-shared/types/global';

export interface UpdateLayoutNameMutationArgs {
  oldName: string;
  newName: string;
}

export const useUpdateLayoutNameMutation = (org: string, app: string) => {
  const { updateFormLayoutName } = useServicesContext();
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app);
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: ({ oldName, newName }: UpdateLayoutNameMutationArgs) =>
      updateFormLayoutName(org, app, oldName, newName).then(() => ({ oldName, newName })),
    onSuccess: ({ oldName, newName }) => {
      dispatch(FormLayoutActions.updateSelectedLayout(newName));
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldLayouts: IFormLayouts) => {
          const newLayouts = deepCopy(oldLayouts);
          newLayouts[newName] = newLayouts[oldName];
          delete newLayouts[oldName];
          return newLayouts;
        }
      );
      const layoutSettings: ILayoutSettings = deepCopy(formLayoutSettingsQuery.data);
      const { order } = layoutSettings?.pages;
      if (order.includes(oldName)) order[order.indexOf(oldName)] = newName;
      if (layoutSettings.receiptLayoutName === oldName) layoutSettings.receiptLayoutName = newName;
      formLayoutSettingsMutation.mutate(layoutSettings);
    }
  });
}
