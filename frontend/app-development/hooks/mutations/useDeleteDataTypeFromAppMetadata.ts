import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useDeleteDataTypeFromAppMetadata = (org: string, app: string) => {
  const { deleteDataTypeFromAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: ({ dataTypeId }: { dataTypeId: string }) =>
      deleteDataTypeFromAppMetadata(org, app, dataTypeId),
  });
};
