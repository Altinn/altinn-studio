import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { FileUploaderNode } from 'src/features/attachments/index';

export const useAttachmentsUploader = () => NodesInternal.useAttachmentsUpload();
export const useAttachmentsUpdater = () => NodesInternal.useAttachmentsUpdate();
export const useAttachmentsRemover = () => NodesInternal.useAttachmentsRemove();
export const useAttachmentsAwaiter = () => NodesInternal.useWaitUntilUploaded();
export const useAddRejectedAttachments = () => NodesInternal.useAddRejectedAttachments();
export const useDeleteFailedAttachment = () => NodesInternal.useDeleteFailedAttachment();

export const useAttachmentsFor = (node: FileUploaderNode | string) =>
  NodesInternal.useAttachments(typeof node === 'string' ? node : node.id);
export const useFailedAttachmentsFor = (node: FileUploaderNode | string) =>
  NodesInternal.useFailedAttachments(typeof node === 'string' ? node : node.id);

export const useAttachmentsSelector = () => NodesInternal.useAttachmentsSelector();

export const useHasPendingAttachments = () => NodesInternal.useHasPendingAttachments();
export const useAttachmentState = () => NodesInternal.useAttachmentState();
export const useAllAttachments = () => NodesInternal.useAllAttachments();
