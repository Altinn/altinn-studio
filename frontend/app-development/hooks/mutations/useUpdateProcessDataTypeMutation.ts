import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessDataTypes } from 'app-shared/api/mutations';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataTypesChange } from 'app-shared/types/api/DataTypesChange';

export const useUpdateProcessDataTypeMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: DataTypesChange) => updateProcessDataTypes(org, app, metadata),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
