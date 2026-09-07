import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpgradeAppMutation = (org: string, app: string) => {
  const { upgradeApp } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => upgradeApp(org, app),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppUpgradeStatus, org, app] }),
    meta: { hideDefaultError: true },
  });
};
