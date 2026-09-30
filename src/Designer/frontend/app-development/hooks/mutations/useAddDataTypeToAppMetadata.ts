import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AddDataTypeToAppMetadataPayload } from 'app-shared/types/api/AddDataTypeToAppMetadataPayload';

export const useAddDataTypeToAppMetadata = (org: string, app: string) => {
  const { addDataTypeToAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: (payload: AddDataTypeToAppMetadataPayload) =>
      addDataTypeToAppMetadata(org, app, payload),
  });
};
