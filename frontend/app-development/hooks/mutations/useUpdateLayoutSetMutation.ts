import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';

export const useUpdateLayoutSetMutation = (org: string, app: string) => {
  const { updateLayoutSet } = useServicesContext();
  const queryClient = useQueryClient();
  const [_, setSelectedLayoutSet] = useLocalStorage<string>('layoutSet/' + app, null);

  return useMutation({
    mutationFn: async ({
      layoutSetIdToUpdate,
      layoutSetConfig,
    }: {
      layoutSetIdToUpdate: string;
      layoutSetConfig: LayoutSetConfig;
    }) =>
      updateLayoutSet(org, app, layoutSetIdToUpdate, layoutSetConfig).then(() => layoutSetConfig),
    onSuccess: (layoutSetConfig) => {
      setSelectedLayoutSet(layoutSetConfig.id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
