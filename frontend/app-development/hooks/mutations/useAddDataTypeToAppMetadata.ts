import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { QueryKey } from 'app-shared/types/QueryKey';
import type { Policy } from '@altinn/process-editor/utils/policy/types';

type AddDataTypeToAppMetadataMutation = {
  dataTypeId: string;
  policy: Policy;
};

export const useAddDataTypeToAppMetadata = (org: string, app: string) => {
  const { addDataTypeToAppMetadata } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dataTypeId, policy }: AddDataTypeToAppMetadataMutation) =>
      addDataTypeToAppMetadata(org, app, dataTypeId, policy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppPolicy, org, app] });
    },
  });
};
