import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';

export const useAddLayoutSetMutation = (org: string, app: string) => {
  const { addLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();
  const [_, setSelectedLayoutSet] = useLocalStorage<string>('layoutSet/' + app, null);

  return useMutation({
    mutationFn: ({
      layoutSetIdToUpdate,
      layoutSetConfig,
    }: {
      layoutSetIdToUpdate: string;
      layoutSetConfig: LayoutSetConfig;
    }) => addLayoutSet(org, app, layoutSetIdToUpdate, layoutSetConfig).then(() => layoutSetConfig),
    onSuccess: (layoutSetConfig) => {
      setSelectedLayoutSet(layoutSetConfig.id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
