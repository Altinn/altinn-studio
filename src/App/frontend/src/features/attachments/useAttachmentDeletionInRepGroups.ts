import { useCallback } from 'react';

import { AttachmentsPlugin } from 'src/features/attachments/AttachmentsPlugin';
import { useAttachmentsAwaiter, useAttachmentsRemover } from 'src/features/attachments/hooks';
import { isAttachmentUploaded } from 'src/features/attachments/index';
import { attachmentSelector } from 'src/features/attachments/tools';
import { FormStore } from 'src/features/form/FormContext';
import { useAsRef } from 'src/hooks/useAsRef';
import { getComponentDef } from 'src/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { CompWithPlugin, IDataModelBindings } from 'src/layout/layout';
import type { NodeData } from 'src/utils/layout/types';

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
export function useAttachmentDeletionInRepGroups(baseComponentId: string) {
  const remove = useAsRef(useAttachmentsRemover());
  const awaiter = useAttachmentsAwaiter();
  const idRef = useAsRef(useIndexedId(baseComponentId));
  const formStore = FormStore.raw.useStore();

  return useCallback(
    async (restriction: number | undefined): Promise<boolean> => {
      const state = formStore.getState();
      const recursiveChildren = new Set<string>(recursivelyFindChildren(idRef.current, state, restriction));
      const uploaderNodeIds = (Object.values(state.nodes.nodeData) as NodeData[])
        .filter((n) => {
          if (!recursiveChildren.has(n.id)) {
            return false;
          }
          const def = getComponentDef(n.nodeType);
          return def && def.hasPlugin(AttachmentsPlugin);
        })
        .map((n) => n.id);

      // This code is intentionally not parallelized, as especially LocalTest can't handle parallel requests to
      // delete attachments. It might return a 500 if you try. To be safe, we do them one by one.
      for (const uploaderId of uploaderNodeIds) {
        const nodeData = state.nodes.nodeData[uploaderId];
        const dataModelBindings = nodeData?.dataModelBindings as IDataModelBindings<
          CompWithPlugin<typeof AttachmentsPlugin>
        >;

        const files = attachmentSelector(uploaderId)(state);
        for (const file of files) {
          if (isAttachmentUploaded(file)) {
            const result = await remove.current({
              attachment: file,
              nodeId: uploaderId,
              dataModelBindings,
            });
            if (!result) {
              return false;
            }
          } else {
            const uploaded = await awaiter(uploaderId, file);
            if (uploaded) {
              const result = await remove.current({
                attachment: {
                  uploaded: true,
                  deleting: false,
                  updating: false,
                  data: uploaded,
                },
                nodeId: uploaderId,
                dataModelBindings,
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
    [formStore, idRef, remove, awaiter],
  );
}

function recursivelyFindChildren(parentId: string, state: FormStoreState, restriction?: number): string[] {
  const children = Object.values(state.nodes.nodeData)
    .filter((n) => n.parentId === parentId && (restriction === undefined || n.rowIndex === restriction))
    .map((n) => n.id);

  return [...children, ...children.flatMap((c) => recursivelyFindChildren(c, state, undefined))];
}
