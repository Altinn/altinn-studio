import { useMutation } from '@tanstack/react-query';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAddAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { addAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: async (metadata: ApplicationAttachmentMetadata) => {
      await addAppAttachmentMetadata(org, app, metadata);
      return metadata;
    },
  });
};
