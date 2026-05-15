import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

import { QueryKey } from 'app-shared/types/QueryKey';

export const useConvertToPageGroups = (org: string, app: string, layoutSetName: string) => {
  const queryClient = useQueryClient();
  const { convertToPageGroups } = useServicesContext();

  return useMutation({
    mutationFn: () => convertToPageGroups(org, app, layoutSetName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.Pages, org, app, layoutSetName] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayoutSettings, org, app, layoutSetName],
      });
    },
  });
};
