import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to import a resource from Altinn 2.
 *
 * @param org the organisation of the user
 */
export const useImportResourceFromAltinn2Mutation = (org: string) => {
  const queryClient = useQueryClient();
  const { importResourceFromAltinn2 } = useServicesContext();

  return useMutation({
    mutationFn: (payload: {
      environment: string;
      serviceCode: string;
      serviceEdition: string;
      resourceId: string;
    }) =>
      importResourceFromAltinn2(
        org,
        payload.environment,
        payload.serviceCode,
        payload.serviceEdition,
        payload.resourceId,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceList, org] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ImportAltinn2Resource, org],
      });
      return data;
    },
  });
};
