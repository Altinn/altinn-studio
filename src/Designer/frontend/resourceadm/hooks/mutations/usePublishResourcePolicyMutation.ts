import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type Policy } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to publish a resource policy
 *
 * @param org the organization of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 */
export const usePublishResourcePolicyMutation = (org: string, repo: string, id: string) => {
  const { publishResourcePolicy } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ env, payload }: { env: string; payload: Policy }) =>
      publishResourcePolicy(org, repo, id, env, payload),
    onSuccess: (_data, { env }) => {
      const queryKey = [QueryKey.Altinn2ResourcePolicies, org, env];
      const isEnvShown = queryClient.getQueryCache().find({ queryKey, exact: true })?.isActive();
      // Reset the env that is not shown, so switching to it shows a spinner instead of the outdated list while it reloads
      return isEnvShown
        ? queryClient.invalidateQueries({ queryKey, exact: true })
        : queryClient.resetQueries({ queryKey, exact: true });
    },
  });
};
