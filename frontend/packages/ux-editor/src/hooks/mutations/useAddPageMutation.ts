import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAddPageMutation = (org: string, app: string, layoutSetName: string) => {
  const { createPage } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (page: PageModel) => createPage(org, app, layoutSetName, page),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.Pages, org, app, layoutSetName] }),
        queryClient.invalidateQueries({
          queryKey: [QueryKey.FormLayouts, org, app, layoutSetName],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
        }),
      ]);
    },
  });
};
