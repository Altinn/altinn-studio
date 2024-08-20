import { useCallback } from 'react';

import { AttachmentsPlugin } from 'src/features/attachments/AttachmentsPlugin';
import { useAttachmentsAwaiter, useAttachmentsRemover, useAttachmentsSelector } from 'src/features/attachments/hooks';
import { isAttachmentUploaded } from 'src/features/attachments/index';
import { useAsRef } from 'src/hooks/useAsRef';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

type UploaderNode = LayoutNode<'FileUpload' | 'FileUploadWithTag'>;

/**
 * When deleting a row in a repeating group, we need to find any attachments that are uploaded
 * in that row (or any of its children) and remove them from the instance.
 *
 * We don't bother with removing attachment references from the form data, as that is handled automatically when
 * the repeating group row is deleted when attachment removal is successful.
 *
 * The 'onBeforeRowDeletion' function you get as a result here gives you a Promise that resolves to true if all
 * attachments were successfully removed, or false if any of them failed to be removed.
 */
export function useAttachmentDeletionInRepGroups(node: LayoutNode<'RepeatingGroup'>) {
  const remove = useAsRef(useAttachmentsRemover());
  const awaiter = useAttachmentsAwaiter();
  const nodeRef = useAsRef(node);
  const attachmentsSelector = useAttachmentsSelector();
  const traversalSelector = useNodeTraversalSelector();
  const nodeItemSelector = NodesInternal.useNodeDataSelector();

  return useCallback(
    async (restriction: TraversalRestriction): Promise<boolean> => {
      const uploaders = traversalSelector(
        (t) =>
          t
            .with(nodeRef.current)
            .flat(undefined, restriction)
            .filter((n) => n.def.hasPlugin(AttachmentsPlugin)),
        [nodeRef.current, restriction],
      ) as UploaderNode[];

      // This code is intentionally not parallelized, as especially LocalTest can't handle parallel requests to
      // delete attachments. It might return a 500 if you try. To be safe, we do them one by one.
      for (const uploader of uploaders) {
        const files = attachmentsSelector(uploader);
        for (const file of files) {
          if (isAttachmentUploaded(file)) {
            const result = await remove.current({
              attachment: file,
              node: uploader,
              dataModelBindings: nodeItemSelector((picker) => picker(uploader)?.layout.dataModelBindings, [uploader]),
            });
            if (!result) {
              return false;
            }
          } else {
            const uploaded = await awaiter(uploader, file);
            if (uploaded) {
              const result = await remove.current({
                attachment: {
                  uploaded: true,
                  deleting: false,
                  updating: false,
                  data: uploaded,
                },
                node: uploader,
                dataModelBindings: nodeItemSelector((picker) => picker(uploader)?.layout.dataModelBindings, [uploader]),
              });
              if (!result) {
                return false;
              }
            }
            // If the attachment was never uploaded successfully, we don't need to remove
            // it, and we can just continue as if removing it was successful.
            return true;
          }
        }
      }

      return true;
    },
    [traversalSelector, nodeRef, attachmentsSelector, remove, nodeItemSelector, awaiter],
  );
}
