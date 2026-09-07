import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppUpgradeMergeRequest } from 'app-shared/types/AppUpgrade';

export const useMergeAppUpgradeMutation = (org: string, app: string) => {
  const { mergeAppUpgrade } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppUpgradeMergeRequest) => mergeAppUpgrade(org, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppUpgradeStatus, org, app] }),
    meta: { hideDefaultError: true },
  });
};
