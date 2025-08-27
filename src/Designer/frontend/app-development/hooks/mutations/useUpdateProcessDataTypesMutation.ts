import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataTypesChange } from 'app-shared/types/api/DataTypesChange';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useUpdateProcessDataTypesMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { updateProcessDataTypes } = useServicesContext();
  return useMutation({
    mutationFn: (metadata: DataTypesChange) => updateProcessDataTypes(org, app, metadata),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
    },
  });
};
