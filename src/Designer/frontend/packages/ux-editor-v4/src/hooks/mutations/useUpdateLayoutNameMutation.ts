import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IFormLayouts } from '../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import type { ILayoutSettings } from 'app-shared/types/global';
import { useAppContext } from '../';

export interface UpdateLayoutNameMutationArgs {
  oldName: string;
  newName: string;
}

export const useUpdateLayoutNameMutation = (org: string, app: string, layoutSetName: string) => {
  const { updateFormLayoutName } = useServicesContext();
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  const { setSelectedFormLayoutName } = useAppContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, newName }: UpdateLayoutNameMutationArgs) =>
      updateFormLayoutName(org, app, oldName, newName, layoutSetName).then(() => ({
        oldName,
        newName,
      })),
    onSuccess: ({ oldName, newName }) => {
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app, layoutSetName],
        (oldLayouts: IFormLayouts) => {
          const newLayouts = ObjectUtils.deepCopy(oldLayouts);
          newLayouts[newName] = newLayouts[oldName];
          delete newLayouts[oldName];
          return newLayouts;
        },
      );
      const layoutSettings: ILayoutSettings = ObjectUtils.deepCopy(formLayoutSettingsQuery.data);
      const { order, pdfLayoutName } = layoutSettings?.pages;
      if (order.includes(oldName)) order[order.indexOf(oldName)] = newName;
      if (pdfLayoutName === oldName) layoutSettings.pages.pdfLayoutName = newName;
      formLayoutSettingsMutation.mutate(layoutSettings);

      setSelectedFormLayoutName(newName);
    },
  });
};
