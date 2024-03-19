import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IFormLayouts } from '../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';
import { useAppContext } from '../../hooks/useAppContext';

export interface UpdateLayoutNameMutationArgs {
  oldName: string;
  newName: string;
}

export const useUpdateLayoutNameMutation = (org: string, app: string, layoutSetName: string) => {
  const { updateFormLayoutName } = useServicesContext();
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const { refetchLayouts, refetchLayoutSettings } = useAppContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, newName }: UpdateLayoutNameMutationArgs) =>
      updateFormLayoutName(org, app, oldName, newName, layoutSetName).then(() => ({
        oldName,
        newName,
      })),
    onSuccess: async ({ oldName, newName }) => {
      // if () {
      //   setSelectedLayoutInLocalStorage(instanceId, pageName);
      //   dispatch(FormLayoutActions.updateSelectedLayout(newName));
      //   setSearchParams((prevParams) => ({ ...prevParams, layout: pageName }));
      //   setOpenAccordion(pageName);
      // }

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

      await refetchLayouts();
      await refetchLayoutSettings();
    },
  });
};
