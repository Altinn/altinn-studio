import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteAppAttachmentMetadataMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { deleteAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteAppAttachmentMetadata(org, app, id);
      return id;
    },
    onSuccess: () => {
      // Issue: this is a workaround to reset the query to get the updated app metadata after deleting an attachment where combobox value is not updated immidiately
      // Todo: this may be solved and can be removed when we start to use >v0.55.0 of designsystem. Replace value prop with initialValue prop in combobox
      queryClient.resetQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
    },
  });
};
