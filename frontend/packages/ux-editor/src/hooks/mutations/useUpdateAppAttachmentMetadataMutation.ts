import { useMutation } from '@tanstack/react-query';
import { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { ApplicationMetadataActions } from '../../../../../app-development/sharedResources/applicationMetadata/applicationMetadataSlice';
import { applicationMetadataSelector } from '../../../../../app-development/sharedResources/applicationMetadata/selectors/applicationMetadataSelector';
import { useDispatch, useSelector } from 'react-redux';

export const useUpdateAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { updateAppAttachmentMetadata } = useServicesContext();
  const dispatch = useDispatch();
  const applicationMetadata = useSelector(applicationMetadataSelector);
  return useMutation({
    mutationFn: async (metadata: ApplicationAttachmentMetadata) => {
      await updateAppAttachmentMetadata(org, app, metadata);
      return metadata;
    },
    onSuccess: (metadata: ApplicationAttachmentMetadata) => {
      dispatch(ApplicationMetadataActions.getApplicationMetadataFulfilled({
        applicationMetadata: {
          ...applicationMetadata,
          ...metadata
        }
      }));
    }
  });
}
