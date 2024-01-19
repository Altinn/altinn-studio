import {
  useAttachments,
  useAttachmentsAwaiter,
  useAttachmentsRemover,
} from 'src/features/attachments/AttachmentsContext';
import { isAttachmentUploaded } from 'src/features/attachments/index';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
  const attachments = useAttachments();
  const remove = useAttachmentsRemover();
  const awaiter = useAttachmentsAwaiter();

  return {
    async onBeforeRowDeletion(index: number): Promise<boolean> {
      const uploaders = node
        .flat(true, index)
        .filter((node) => node.item.type === 'FileUpload' || node.item.type === 'FileUploadWithTag') as UploaderNode[];

      // This code is intentionally not parallelized, as especially LocalTest can't handle parallel requests to
      // delete attachments. It might return a 500 if you try. To be safe, we do them one by one.
      for (const uploader of uploaders) {
        const files = attachments[uploader.item.id] ?? [];
        for (const file of files) {
          if (isAttachmentUploaded(file)) {
            const result = await remove({
              attachment: file,
              node: uploader,
            });
            if (!result) {
              return false;
            }
          } else {
            const uploaded = await awaiter(file);
            if (uploaded) {
              const result = await remove({
                attachment: {
                  uploaded: true,
                  deleting: false,
                  updating: false,
                  data: uploaded,
                },
                node: uploader,
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
  };
}
