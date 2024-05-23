import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessDataType } from 'app-shared/api/mutations';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataTypeChange } from 'app-shared/types/api/DataTypeChange';

export const useUpdateProcessDataTypeMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: DataTypeChange) => updateProcessDataType(org, app, metadata),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
