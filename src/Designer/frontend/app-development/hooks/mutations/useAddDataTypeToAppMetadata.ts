import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

type AddDataTypeToAppMetadataMutation = {
  dataTypeId: string;
  taskId: string;
  allowedContributers?: Array<string>;
};

export const useAddDataTypeToAppMetadata = (org: string, app: string) => {
  const { addDataTypeToAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: ({ dataTypeId, taskId, allowedContributers }: AddDataTypeToAppMetadataMutation) =>
      addDataTypeToAppMetadata(org, app, dataTypeId, taskId, allowedContributers),
  });
};
