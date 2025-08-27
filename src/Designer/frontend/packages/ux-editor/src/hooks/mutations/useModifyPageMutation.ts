import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useModifyPageMutation = (
  org: string,
  app: string,
  layoutSetName: string,
  pageName: string,
) => {
  const { modifyPage } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PageModel) => modifyPage(org, app, layoutSetName, pageName, payload),
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
