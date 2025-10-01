import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';

export const useAttachmentsUploader = () => NodesInternal.useAttachmentsUpload();
export const useAttachmentsUpdater = () => NodesInternal.useAttachmentsUpdate();
export const useAttachmentsRemover = () => NodesInternal.useAttachmentsRemove();
export const useAttachmentsAwaiter = () => NodesInternal.useWaitUntilUploaded();
export const useAddRejectedAttachments = () => NodesInternal.useAddRejectedAttachments();
export const useDeleteFailedAttachment = () => NodesInternal.useDeleteFailedAttachment();

export const useAttachmentsFor = (baseComponentId: string) => {
  const indexedId = useIndexedId(baseComponentId);
  return NodesInternal.useAttachments(indexedId);
};
export const useFailedAttachmentsFor = (baseComponentId: string) => {
  const indexedId = useIndexedId(baseComponentId);
  return NodesInternal.useFailedAttachments(indexedId);
};

export const useHasPendingAttachments = () => NodesInternal.useHasPendingAttachments();
export const useAttachmentState = () => NodesInternal.useAttachmentState();
export const useAllAttachments = () => NodesInternal.useAllAttachments();
