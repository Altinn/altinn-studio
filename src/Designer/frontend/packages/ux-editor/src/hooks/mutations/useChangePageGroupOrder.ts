import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

import { QueryKey } from 'app-shared/types/QueryKey';

export const useChangePageGroupOrder = (org: string, app: string, layoutSetName: string) => {
  const queryClient = useQueryClient();
  const { changePageGroups } = useServicesContext();

  return useMutation({
    mutationFn: (pages: PagesModel) => changePageGroups(org, app, layoutSetName, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Pages, org, app, layoutSetName] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
      });
    },
  });
};
