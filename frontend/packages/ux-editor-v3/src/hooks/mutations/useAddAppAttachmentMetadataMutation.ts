import { useMutation } from '@tanstack/react-query';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationMetadataActions } from '../../../../../app-development/sharedResources/applicationMetadata/applicationMetadataSlice';
import { makeGetApplicationMetadata } from '../../../../../app-development/sharedResources/applicationMetadata/selectors/applicationMetadataSelector';

export const useAddAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { addAppAttachmentMetadata } = useServicesContext();
  const dispatch = useDispatch();
  const applicationMetadata = useSelector(makeGetApplicationMetadata);
  return useMutation({
    mutationFn: async (metadata: ApplicationAttachmentMetadata) => {
      await addAppAttachmentMetadata(org, app, metadata);
      return metadata;
    },
    onSuccess: (metadata: ApplicationAttachmentMetadata) => {
      dispatch(
        ApplicationMetadataActions.getApplicationMetadataFulfilled({
          applicationMetadata: {
            ...applicationMetadata,
            ...metadata,
          },
        }),
      );
    },
  });
};
