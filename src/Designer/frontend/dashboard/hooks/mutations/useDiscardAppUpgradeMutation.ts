import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppUpgradeDiscardRequest } from 'app-shared/types/AppUpgrade';

export const useDiscardAppUpgradeMutation = (org: string, app: string) => {
  const { discardAppUpgrade } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppUpgradeDiscardRequest) => discardAppUpgrade(org, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppUpgradeStatus, org, app] }),
    meta: { hideDefaultError: true },
  });
};
