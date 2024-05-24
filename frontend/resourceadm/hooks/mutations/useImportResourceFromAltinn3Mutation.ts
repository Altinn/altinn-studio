import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to import a resource from Altinn 3.
 *
 * @param org the organisation of the user
 */
export const useImportResourceFromAltinn3Mutation = (org: string) => {
  const queryClient = useQueryClient();
  const { importResourceFromAltinn3 } = useServicesContext();

  return useMutation({
    mutationFn: (payload: { resourceId: string; environment: string }) =>
      importResourceFromAltinn3(org, payload.resourceId, payload.environment),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceList, org] });
      return data;
    },
  });
};
