import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from '../useAppContext';

export const useChangePageOrderMutation = (org: string, app: string, layoutSetName: string) => {
  const { updateLayoutSettingsForPreview } = useAppContext();
  const { changePageOrder } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pages: PagesModel) => changePageOrder(org, app, layoutSetName, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Pages, org, app, layoutSetName] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
      });
      updateLayoutSettingsForPreview(layoutSetName);
    },
  });
};
