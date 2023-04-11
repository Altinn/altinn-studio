import { useMutation } from '@tanstack/react-query';
import { ApplicationAttachmentMetadata } from '../../features/formDesigner/formDesignerTypes';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { ApplicationMetadataActions } from '../../../../../app-development/sharedResources/applicationMetadata/applicationMetadataSlice';
import { makeGetApplicationMetadata } from '../../../../../app-development/sharedResources/applicationMetadata/selectors/applicationMetadataSelector';
import { useDispatch, useSelector } from 'react-redux';

export const useUpdateAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { updateAppAttachmentMetadata } = useServicesContext();
  const dispatch = useDispatch();
  const applicationMetadata = useSelector(makeGetApplicationMetadata);
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
