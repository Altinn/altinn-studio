import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from '../useAppContext';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

export const useAddLayoutSetMutation = (org: string, app: string) => {
  const { addLayoutSet } = useServicesContext();
  const { setSelectedLayoutSet } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (layoutSetConfig: LayoutSetConfig) =>
      addLayoutSet(org, app, layoutSetConfig).then((layoutSets) => ({
        layoutSetConfig,
        layoutSets,
      })),

    onSuccess: ({ layoutSetConfig, layoutSets }) => {
      setSelectedLayoutSet(layoutSetConfig.id);
      queryClient.setQueryData([QueryKey.LayoutSets, org, app], () => layoutSets);
    },
  });
};
