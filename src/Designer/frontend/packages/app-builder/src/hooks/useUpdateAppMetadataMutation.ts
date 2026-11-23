import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

export const useUpdateAppMetadataMutation = (org: string, app: string) => {
  const { updateAppMetadata } = useServicesContext();
  const queryClient = useQueryClient();
  const queryKey = [QueryKey.AppMetadata, org, app];
  return useMutation({
    mutationFn: (metadata: ApplicationMetadata) => updateAppMetadata(org, app, metadata),
    onMutate: (metadata: ApplicationMetadata): void => {
      queryClient.setQueryData(queryKey, metadata);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};
