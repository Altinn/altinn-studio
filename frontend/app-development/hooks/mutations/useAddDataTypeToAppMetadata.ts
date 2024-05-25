import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type AddDataTypeToAppMetadataMutation = {
  dataTypeId: string;
  policy: any; // TODO use the shared-types for Policy
};

export const useAddDataTypeToAppMetadata = (org: string, app: string) => {
  const { addDataTypeToAppMetadata } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dataTypeId, policy }: AddDataTypeToAppMetadataMutation) =>
      addDataTypeToAppMetadata(org, app, dataTypeId, policy),
    onSuccess: () => {
      // This invalidation should be moved to ProcessEditor.tsx onSuccessMessage from web-sockets when refactored to use process-definition-latest endpoint.
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppPolicy, org, app] });
    },
  });
};
