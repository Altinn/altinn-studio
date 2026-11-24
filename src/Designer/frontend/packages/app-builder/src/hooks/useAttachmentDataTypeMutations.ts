import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';

/**
 * A file upload saves its attachments as a data type in the app metadata, which says which files it
 * takes and how many. These keep the data type in step with the component.
 */
export const useAddAttachmentDataTypeMutation = (org: string, app: string) => {
  const { addAppAttachmentMetadata } = useServicesContext();
  const invalidateMetadata = useInvalidateAppMetadata(org, app);
  return useMutation({
    mutationFn: (metadata: ApplicationAttachmentMetadata) =>
      addAppAttachmentMetadata(org, app, metadata),
    onSettled: invalidateMetadata,
  });
};

export const useUpdateAttachmentDataTypeMutation = (org: string, app: string) => {
  const { updateAppAttachmentMetadata } = useServicesContext();
  const invalidateMetadata = useInvalidateAppMetadata(org, app);
  return useMutation({
    mutationFn: (metadata: ApplicationAttachmentMetadata) =>
      updateAppAttachmentMetadata(org, app, metadata),
    onSettled: invalidateMetadata,
  });
};

export const useDeleteAttachmentDataTypeMutation = (org: string, app: string) => {
  const { deleteAppAttachmentMetadata } = useServicesContext();
  const invalidateMetadata = useInvalidateAppMetadata(org, app);
  return useMutation({
    mutationFn: (dataTypeId: string) => deleteAppAttachmentMetadata(org, app, dataTypeId),
    onSettled: invalidateMetadata,
  });
};

const useInvalidateAppMetadata = (org: string, app: string) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
};
