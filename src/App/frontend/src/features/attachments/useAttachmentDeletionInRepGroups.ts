import { useCallback } from 'react';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useAttachmentsAwaiter, useAttachmentsRemover } from 'src/features/attachments/hooks';
import { isAttachmentUploaded } from 'src/features/attachments/index';
import { type AttachmentNode, attachmentSelector } from 'src/features/attachments/tools';
import { FormStore } from 'src/features/form/FormContext';
import { useSelectFromInstanceData } from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useAsRef } from 'src/hooks/useAsRef';
import { getComponentBehaviors } from 'src/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { getDerivedNodeDescendantIds } from 'src/utils/layout/derivedNodeTraversal';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { getIndexedDataModelBindings } from 'src/utils/layout/rowContext';

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
  const selectFromInstance = useSelectFromInstanceData();
  const taskId = useAsRef(useProcessTaskId());

  return useCallback(
    async (restriction: number | undefined): Promise<boolean> => {
      const state = formStore.getState();
      const nodes = deriveRuntimeNodeRefs(state);
      const recursiveChildren = new Set<string>(getDerivedNodeDescendantIds(nodes, idRef.current, restriction));
      const instanceData = selectFromInstance((instance) => instance.data) ?? [];
      const uploaderNodes = nodes.filter((node) => {
        const component = state.bootstrap.layoutLookups.getComponent(node.baseId);
        return recursiveChildren.has(node.id) && getComponentBehaviors(component.type)?.canHaveAttachments;
      });

      // This code is intentionally not parallelized, as especially LocalTest can't handle parallel requests to
      // delete attachments. It might return a 500 if you try. To be safe, we do them one by one.
      for (const uploader of uploaderNodes) {
        const attachmentNode: AttachmentNode = {
          id: uploader.id,
          baseId: uploader.baseId,
          dataModelBindings: getIndexedDataModelBindings(
            state.bootstrap.layoutLookups.getComponent(uploader.baseId).dataModelBindings,
            uploader.rowContexts,
          ) as AttachmentNode['dataModelBindings'],
        };

        const files = attachmentSelector(attachmentNode, state, instanceData, getApplicationMetadata(), taskId.current);
        for (const file of files) {
          if (isAttachmentUploaded(file)) {
            const result = await remove.current({
              attachment: file,
              nodeId: uploader.id,
              dataModelBindings: attachmentNode.dataModelBindings,
            });
            if (!result) {
              return false;
            }
          } else {
            const uploaded = await awaiter(uploader.id, file);
            if (uploaded) {
              const result = await remove.current({
                attachment: {
                  uploaded: true,
                  deleting: false,
                  updating: false,
                  data: uploaded,
                },
                nodeId: uploader.id,
                dataModelBindings: attachmentNode.dataModelBindings,
              });
              if (!result) {
                return false;
              }
            }
            // If the attachment was never uploaded successfully, we don't need to remove
            // it, and we can just continue as if removing it was successful.
          }
        }
      }

      return true;
    },
    [formStore, idRef, remove, awaiter, selectFromInstance, taskId],
  );
}
