import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useImportResourceFromAltinn2Mutation = (org: string) => {
  const queryClient = useQueryClient();
  const { importResourceFromAltinn2 } = useServicesContext();

  return useMutation({
    mutationFn: (payload: { environment: string; serviceCode: string; serviceEdition: string }) =>
      importResourceFromAltinn2(
        org,
        payload.environment,
        payload.serviceCode,
        payload.serviceEdition,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ImportAltinn2Resource, org],
      });
      console.log('data received from import call: ', data);
      return data;
    },
  });
};
