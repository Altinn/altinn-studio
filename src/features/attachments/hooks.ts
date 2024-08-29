import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { FileUploaderNode } from 'src/features/attachments/index';

export const useAttachmentsUploader = () => NodesInternal.useAttachmentsUpload();
export const useAttachmentsUpdater = () => NodesInternal.useAttachmentsUpdate();
export const useAttachmentsRemover = () => NodesInternal.useAttachmentsRemove();
export const useAttachmentsAwaiter = () => NodesInternal.useWaitUntilUploaded();

export const useAttachmentsFor = (node: FileUploaderNode) => NodesInternal.useAttachments(node);

export const useAttachmentsSelector = () => NodesInternal.useAttachmentsSelector();

export const useHasPendingAttachments = () => NodesInternal.useHasPendingAttachments();
export const useAllAttachments = () => NodesInternal.useAllAttachments();
