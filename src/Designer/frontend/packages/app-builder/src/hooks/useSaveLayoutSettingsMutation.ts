import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ILayoutSettings } from 'app-shared/types/global';

/**
 * Changes the layout settings of the layout set. The change is made to the settings in the cache, so
 * settings the builder does not know about are kept, and nothing is saved when nothing changed.
 */
export const useSaveLayoutSettingsMutation = (org: string, app: string, layoutSetName: string) => {
  const { saveFormLayoutSettings } = useServicesContext();
  const queryClient = useQueryClient();
  const queryKey = [QueryKey.FormLayoutSettings, org, app, layoutSetName];
  return useMutation({
    mutationFn: async (change: (settings: ILayoutSettings) => ILayoutSettings) => {
      const current = queryClient.getQueryData<ILayoutSettings>(queryKey) ?? {};
      const updated = change(current);
      if (updated === current) return current;
      queryClient.setQueryData(queryKey, updated);
      return saveFormLayoutSettings(org, app, layoutSetName, updated);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};
