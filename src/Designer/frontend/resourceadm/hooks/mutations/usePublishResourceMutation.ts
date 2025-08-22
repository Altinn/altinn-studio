import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to publish a resource
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 */
export const usePublishResourceMutation = (org: string, repo: string, id: string) => {
  const queryClient = useQueryClient();
  const { publishResource } = useServicesContext();

  return useMutation({
    mutationFn: (env: string) => publishResource(org, repo, id, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PublishResource, org, repo, id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourcePublishStatus, org, repo, id] });
    },
  });
};
