import { ContextNotProvided } from 'src/core/contexts/context';
import { AttachmentsPlugin } from 'src/features/attachments/AttachmentsPlugin';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSilent } from 'src/utils/layout/useNodeTraversal';
import type { FileUploaderNode, IAttachmentsMap } from 'src/features/attachments/index';

export const useAttachmentsUploader = () => NodesInternal.useAttachmentsUpload();
export const useAttachmentsUpdater = () => NodesInternal.useAttachmentsUpdate();
export const useAttachmentsRemover = () => NodesInternal.useAttachmentsRemove();
export const useAttachmentsAwaiter = () => NodesInternal.useWaitUntilUploaded();

export const useAttachmentsFor = (node: FileUploaderNode) => NodesInternal.useAttachments(node);

export const useAttachmentsSelector = () => NodesInternal.useAttachmentsSelector();
export const useLaxAttachmentsSelector = () => NodesInternal.useLaxAttachmentsSelector();

export function useHasPendingAttachments() {
  const selector = useLaxAttachmentsSelector();
  return (
    useNodeTraversalSilent((t) => {
      if (selector === ContextNotProvided) {
        return false;
      }

      const withAttachments = t.allNodes().filter((node) => node.def.hasPlugin(AttachmentsPlugin));
      return withAttachments.some((node: FileUploaderNode) => {
        const attachments = selector(node);
        return attachments.some((attachment) => !attachment.uploaded || attachment.updating || attachment.deleting);
      });
    }) ?? false
  );
}

const emptyMap: IAttachmentsMap = {};
export function useAllAttachments(): IAttachmentsMap {
  const selector = useAttachmentsSelector();
  return (
    useNodeTraversalSilent((t) => {
      const out: IAttachmentsMap = {};
      const withAttachments = t
        .allNodes()
        .filter((node) => node.def.hasPlugin(AttachmentsPlugin)) as FileUploaderNode[];
      for (const node of withAttachments) {
        out[node.id] = selector(node);
      }
      return out;
    }) ?? emptyMap
  );
}
