import { useMutation } from '@tanstack/react-query';
import { ApplicationAttachmentMetadata } from '../../features/formDesigner/formDesignerTypes';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';

export const useUpdateAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { updateAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: (metadata: ApplicationAttachmentMetadata) =>
      updateAppAttachmentMetadata(org, app, metadata)
    // Todo: Add onSuccess to update the attachment metadata in the frontend
  });
}
