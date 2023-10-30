import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppContext } from '../useAppContext';

export interface ConfigureLayoutSetMutationArgs {
  layoutSetName: string;
}

export const useConfigureLayoutSetMutation = (org: string, app: string) => {
  const { configureLayoutSet } = useServicesContext();
  const { setSelectedLayoutSet } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ layoutSetName }: ConfigureLayoutSetMutationArgs) =>
      configureLayoutSet(org, app, layoutSetName).then((layoutSets) => ({
        layoutSetName,
        layoutSets,
      })),

    onSuccess: ({ layoutSetName, layoutSets }) => {
      setSelectedLayoutSet(layoutSetName);
      queryClient.setQueryData([QueryKey.LayoutSets, org, app], () => layoutSets);
    },
  });
};
