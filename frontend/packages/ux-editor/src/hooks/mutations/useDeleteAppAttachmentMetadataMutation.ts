import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';

export const useDeleteAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { deleteAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: (id: string) =>
      deleteAppAttachmentMetadata(org, app, id)
    // Todo: Add onSuccess to update the attachment metadata in the frontend
  });
}
