import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

type AddDataTypeToAppMetadataMutation = {
  dataTypeId: string;
  policy: any; // TODO use the shared-types for Policy
};

export const useAddDataTypeToAppMetadata = (org: string, app: string) => {
  const { addDataTypeToAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: ({ dataTypeId, policy }: AddDataTypeToAppMetadataMutation) =>
      addDataTypeToAppMetadata(org, app, dataTypeId, policy),
  });
};
