import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgInactivityUndeploySettings } from 'app-shared/types/OrgInactivityUndeploySettings';

export const useUpdateInactivityUndeploySettingsMutation = (org: string) => {
  const { updateOrgInactivityUndeploySettings } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: OrgInactivityUndeploySettings) =>
      updateOrgInactivityUndeploySettings(org, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgInactivityUndeploySettings, org] });
    },
  });
};
