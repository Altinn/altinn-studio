import { useIsMutating } from '@tanstack/react-query';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { AttachmentMutations } from 'src/features/attachments/hooks/attachmentMutations';
import { sortAttachmentsByName } from 'src/features/attachments/sortAttachments';
import { attachmentMutationKeys, type AttachmentNode, attachmentSelector } from 'src/features/attachments/tools';
import { FileScanResults } from 'src/features/attachments/types';
import { hasPendingAttachmentScans, hasTemporaryAttachments } from 'src/features/attachments/utils';
import { FormStore } from 'src/features/form/FormContext';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { getComponentBehaviors } from 'src/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { useIntermediateItem } from 'src/utils/layout/hooks';
import { getIndexedDataModelBindings } from 'src/utils/layout/rowContext';
import type { IAttachment, IAttachmentsMap, IFailedAttachment } from 'src/features/attachments';
import type { AttachmentStateInfo } from 'src/features/attachments/types';

const emptyArray = [];
const ATTACHMENT_STATE_RESULTS = {
  infected: { hasPending: false, state: FileScanResults.Infected },
  uploading: { hasPending: true, state: 'uploading' },
  pending: { hasPending: true, state: FileScanResults.Pending },
  ready: { hasPending: false, state: 'ready' },
} as const;

function useAttachmentNode(baseComponentId: string): AttachmentNode {
  const indexedId = useIndexedId(baseComponentId);
  const item = useIntermediateItem(baseComponentId);
  return {
    id: indexedId,
    baseId: baseComponentId,
    dataModelBindings: item.dataModelBindings as AttachmentNode['dataModelBindings'],
  };
}

export const AttachmentReadModel = {
  useAttachmentsFor(baseComponentId: string): IAttachment[] {
    const node = useAttachmentNode(baseComponentId);
    const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
    const taskId = useProcessTaskId();
    const pendingMutations = AttachmentMutations.usePendingAttachmentMutations();
    return FormStore.raw.useMemoSelector((state) =>
      attachmentSelector(node, state, instanceData, getApplicationMetadata(), taskId, pendingMutations),
    );
  },

  useFailedAttachmentsFor(baseComponentId: string): IFailedAttachment[] {
    const indexedId = useIndexedId(baseComponentId);
    return FormStore.raw.useShallowSelector((state) =>
      Object.values(state.attachments.failed[indexedId] ?? {}).sort(sortAttachmentsByName),
    );
  },

  useAllAttachments(): IAttachmentsMap {
    const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
    const taskId = useProcessTaskId();
    const pendingMutations = AttachmentMutations.usePendingAttachmentMutations();
    return FormStore.raw.useMemoSelector((state) => {
      const attachments: IAttachmentsMap = {};
      for (const node of deriveRuntimeNodeRefs(state)) {
        const component = state.bootstrap.layoutLookups.getComponent(node.baseId);
        if (!getComponentBehaviors(component.type)?.canHaveAttachments) {
          continue;
        }
        attachments[node.id] = attachmentSelector(
          {
            id: node.id,
            baseId: node.baseId,
            dataModelBindings: getIndexedDataModelBindings(
              component.dataModelBindings,
              node.rowContexts,
            ) as AttachmentNode['dataModelBindings'],
          },
          state,
          instanceData,
          getApplicationMetadata(),
          taskId,
          pendingMutations,
        );
      }
      return attachments;
    });
  },

  useHasPendingAttachments(): boolean {
    const hasTemporary = FormStore.raw.useLaxSelector(hasTemporaryAttachments);
    const hasActiveMutations = useIsMutating({ mutationKey: attachmentMutationKeys.all, status: 'pending' }) > 0;
    const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
    return hasTemporary === true || hasActiveMutations || hasPendingAttachmentScans(instanceData);
  },

  useAttachmentState(): AttachmentStateInfo {
    const allAttachments = AttachmentReadModel.useAllAttachments();
    const hasPending = AttachmentReadModel.useHasPendingAttachments();
    const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;

    if (
      Object.values(allAttachments).some((attachments) =>
        attachments?.some(
          (attachment) => attachment.uploaded && attachment.data.fileScanResult === FileScanResults.Infected,
        ),
      )
    ) {
      return ATTACHMENT_STATE_RESULTS.infected;
    }
    if (hasPending && !hasPendingAttachmentScans(instanceData)) {
      return ATTACHMENT_STATE_RESULTS.uploading;
    }
    if (hasPendingAttachmentScans(instanceData)) {
      return ATTACHMENT_STATE_RESULTS.pending;
    }
    return ATTACHMENT_STATE_RESULTS.ready;
  },
};
