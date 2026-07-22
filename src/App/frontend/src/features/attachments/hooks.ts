import { FormStore } from 'src/features/form/FormContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

export const useAttachmentsUploader = () => FormStore.nodes.useAttachmentsUpload();
export const useAttachmentsUpdater = () => FormStore.nodes.useAttachmentsUpdate();
export const useAttachmentsRemover = () => FormStore.nodes.useAttachmentsRemove();
export const useAttachmentsAwaiter = () => FormStore.nodes.useWaitUntilUploaded();
export const useAddRejectedAttachments = () => FormStore.nodes.useAddRejectedAttachments();
export const useDeleteFailedAttachment = () => FormStore.nodes.useDeleteFailedAttachment();

export const useAttachmentsFor = (baseComponentId: string) => {
  const indexedId = useIndexedId(baseComponentId);
  return FormStore.nodes.useAttachments(indexedId);
};
export const useFailedAttachmentsFor = (baseComponentId: string) => {
  const indexedId = useIndexedId(baseComponentId);
  return FormStore.nodes.useFailedAttachments(indexedId);
};

export const useHasPendingAttachments = () => FormStore.nodes.useHasPendingAttachments();
export const useAttachmentState = () => FormStore.nodes.useAttachmentState();
export const useAllAttachments = () => FormStore.nodes.useAllAttachments();
