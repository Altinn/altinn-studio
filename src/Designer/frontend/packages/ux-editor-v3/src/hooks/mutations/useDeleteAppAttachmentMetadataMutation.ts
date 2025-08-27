import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useDeleteAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { deleteAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteAppAttachmentMetadata(org, app, id);
      return id;
    },
  });
};
