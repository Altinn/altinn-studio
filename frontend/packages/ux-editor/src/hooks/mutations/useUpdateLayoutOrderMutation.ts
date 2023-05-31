import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { useMutation } from '@tanstack/react-query';
import { deepCopy } from 'app-shared/pure';

export interface UpdateLayoutOrderMutationArgs {
  layoutName: string;
  direction: 'up' | 'down';
}

export const useUpdateLayoutOrderMutation = (org: string, app: string, layoutSetName: string) => {
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, layoutSetName);
  const formLayoutSettingsMutation = useFormLayoutSettingsMutation(org, app, layoutSetName);
  return useMutation({
    mutationFn: ({ layoutName, direction }: UpdateLayoutOrderMutationArgs) => {
      const layoutSettings = deepCopy(formLayoutSettingsQuery.data);
      const { order } = layoutSettings.pages;
      const currentIndex = order.indexOf(layoutName);
      let destination: number;
      if (direction === 'up') {
        destination = currentIndex - 1;
      } else if (direction === 'down') {
        destination = currentIndex + 1;
      }
      order.splice(currentIndex, 1);
      order.splice(destination, 0, layoutName);
      return formLayoutSettingsMutation.mutateAsync(layoutSettings);
    }
  })
}
