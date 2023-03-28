import { useMutation } from '@tanstack/react-query';
import { ApplicationAttachmentMetadata } from '../../features/formDesigner/formDesignerTypes';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';

export const useAddAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { addAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: (metadata: ApplicationAttachmentMetadata) =>
      addAppAttachmentMetadata(org, app, metadata)
    // Todo: Add onSuccess to update the attachment metadata in the frontend
  });
}
