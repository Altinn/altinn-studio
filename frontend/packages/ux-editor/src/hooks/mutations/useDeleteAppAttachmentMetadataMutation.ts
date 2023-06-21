import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationMetadataActions } from '../../../../../app-development/sharedResources/applicationMetadata/applicationMetadataSlice';
import { makeGetApplicationMetadata } from '../../../../../app-development/sharedResources/applicationMetadata/selectors/applicationMetadataSelector';

export const useDeleteAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { deleteAppAttachmentMetadata } = useServicesContext();
  const dispatch = useDispatch();
  const applicationMetadata = useSelector(makeGetApplicationMetadata) ?? {};
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteAppAttachmentMetadata(org, app, id);
      return id;
    },
    onSuccess: (id: string) => {
      delete applicationMetadata[id];
      dispatch(ApplicationMetadataActions.getApplicationMetadataFulfilled({ applicationMetadata }));
    }
  });
}
