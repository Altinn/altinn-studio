import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAddDataTypeToAppMetadata = (org: string, app: string) => {
  const { addDataTypeToAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: ({ dataTypeId, taskId }: { dataTypeId: string; taskId: string }) =>
      addDataTypeToAppMetadata(org, app, dataTypeId, taskId),
  });
};
