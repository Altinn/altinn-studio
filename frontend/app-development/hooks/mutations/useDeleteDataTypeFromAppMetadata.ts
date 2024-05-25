import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { Policy } from '@altinn/policy-editor/types';

export const useDeleteDataTypeFromAppMetadata = (org: string, app: string) => {
  const { deleteDataTypeFromAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: ({ dataTypeId, policy }: { dataTypeId: string; policy?: Policy }) =>
      deleteDataTypeFromAppMetadata(org, app, dataTypeId, policy),
  });
};
