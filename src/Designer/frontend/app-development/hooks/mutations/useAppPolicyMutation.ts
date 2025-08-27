import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { Policy } from 'packages/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to edit an existing policy in an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 */
export const useAppPolicyMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { updateAppPolicy } = useServicesContext();

  return useMutation({
    mutationFn: (payload: Policy) => updateAppPolicy(org, app, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppPolicy, org, app] });
    },
  });
};
