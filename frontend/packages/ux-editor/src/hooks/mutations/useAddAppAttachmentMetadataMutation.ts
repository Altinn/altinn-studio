import { useMutation } from '@tanstack/react-query';
import { ApplicationAttachmentMetadata } from '../../features/formDesigner/formDesignerTypes';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
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
      dispatch(ApplicationMetadataActions.getApplicationMetadataFulfilled({
        applicationMetadata: {
          ...applicationMetadata,
          ...metadata
        }
      }));
    }
  });
}
