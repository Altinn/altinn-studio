import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeletePageMutation = (org: string, app: string, layoutSetName: string) => {
  const { deletePage } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageName: string) => deletePage(org, app, layoutSetName, pageName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Pages, org, app, layoutSetName] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
      });
    },
  });
};
