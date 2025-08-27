import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { Policy } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to edit an existing policy in a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 */
export const useEditResourcePolicyMutation = (org: string, repo: string, id: string) => {
  const queryClient = useQueryClient();
  const { updatePolicy } = useServicesContext();

  return useMutation({
    mutationFn: (payload: Policy) => updatePolicy(org, repo, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourcePolicy, org, repo, id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, org, repo] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceList, org] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourcePolicy, org, repo, id] });
    },
  });
};
