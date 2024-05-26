import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { Policy } from '@altinn/process-editor/utils/policy/types';

export const useDeleteDataTypeFromAppMetadata = (org: string, app: string) => {
  const { deleteDataTypeFromAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: ({ dataTypeId, policy }: { dataTypeId: string; policy?: Policy }) =>
      deleteDataTypeFromAppMetadata(org, app, dataTypeId, policy),
  });
};
