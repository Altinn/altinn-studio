import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { PolicyBackendType } from 'resourceadm/types/global';

export const useEditResourcePolicyMutation = (org: string, repo: string, id: string) => {
  const queryClient = useQueryClient();
  const { updatePolicy } = useServicesContext();

  return useMutation({
    mutationFn: (payload: PolicyBackendType) => updatePolicy(org, repo, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.ResourcePolicy, org, repo, id] })
  })
}
