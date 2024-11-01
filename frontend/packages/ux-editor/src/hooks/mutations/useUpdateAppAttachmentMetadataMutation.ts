import { useMutation } from '@tanstack/react-query';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { toast } from 'react-toastify';

export const useUpdateAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { updateAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: async (metadata: ApplicationAttachmentMetadata) => {
      await updateAppAttachmentMetadata(org, app, metadata).catch((error) => {
        toast.error('useUpdateAppAttachmentMetadataMutation --- ', error);

        return error;
      });
      return metadata;
    },
  });
};
