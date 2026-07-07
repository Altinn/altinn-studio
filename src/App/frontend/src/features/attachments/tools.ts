import dot from 'dot-object';

import { sortAttachmentsByName } from 'src/features/attachments/sortAttachments';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type {
  IAttachment,
  StoredTemporaryAttachment,
  TemporaryAttachment,
  UploadedAttachment,
} from 'src/features/attachments';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { IDataModelBindingsList, IDataModelBindingsSimple } from 'src/layout/common.generated';
import type { CompIntermediate } from 'src/layout/layout';
import type { IData } from 'src/types/shared';

export const attachmentMutationKeys = {
  all: ['attachments'] as const,
  upload: () => [...attachmentMutationKeys.all, 'upload'] as const,
  update: () => [...attachmentMutationKeys.all, 'update'] as const,
  remove: () => [...attachmentMutationKeys.all, 'remove'] as const,
};

export type AttachmentNode = {
  id: string;
  baseId: string;
  dataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList | undefined;
};

export type PendingAttachmentMutation =
  | {
      type: 'upload';
      nodeId: string;
      temporaryId: string;
    }
  | {
      type: 'update' | 'remove';
      nodeId: string;
      dataElementId: string;
    };

export function makeAttachmentNode(baseId: string, component: CompIntermediate): AttachmentNode {
  return {
    id: component.id,
    baseId,
    dataModelBindings: component.dataModelBindings as AttachmentNode['dataModelBindings'],
  };
}

function pickDebounced(state: FormStoreState, reference: { dataType: string; field: string }) {
  return dot.pick(reference.field, state.data.models[reference.dataType]?.debouncedCurrentData);
}

function isCanonicalAttachment(data: IData, node: AttachmentNode, application: ApplicationMetadata, taskId?: string) {
  if (data.dataType !== node.baseId) {
    return false;
  }

  const dataType = application.dataTypes.find((candidate) => candidate.id === data.dataType);
  return (
    !!dataType &&
    (!dataType.taskId || dataType.taskId === taskId) &&
    !dataType.appLogic?.classRef &&
    dataType.id !== 'ref-data-as-pdf'
  );
}

/**
 * Derives uploaded attachments for one indexed uploader directly from canonical
 * instance data and its current debounced data-model binding.
 */
export function selectUploadedAttachments(
  node: AttachmentNode,
  state: FormStoreState,
  instanceData: IData[],
  application: ApplicationMetadata,
  taskId?: string,
): UploadedAttachment[] {
  const bindings = node.dataModelBindings;
  const hasSimpleBinding = !!bindings && 'simpleBinding' in bindings;
  const hasListBinding = !!bindings && 'list' in bindings;
  const simpleValue = hasSimpleBinding ? pickDebounced(state, bindings.simpleBinding) : undefined;
  const listValue = hasListBinding ? pickDebounced(state, bindings.list) : undefined;
  const nodeIsInRepeatingGroup = node.id !== node.baseId;
  const nodeIsBound = hasSimpleBinding || hasListBinding;
  const seen = new Set<string>();

  return instanceData
    .filter((data) => {
      if (seen.has(data.id) || !isCanonicalAttachment(data, node, application, taskId)) {
        return false;
      }
      if (simpleValue && simpleValue === data.id) {
        seen.add(data.id);
        return true;
      }
      if (Array.isArray(listValue) && listValue.includes(data.id)) {
        seen.add(data.id);
        return true;
      }
      const belongsToUnboundNode = !nodeIsBound && !nodeIsInRepeatingGroup;
      if (belongsToUnboundNode) {
        seen.add(data.id);
      }
      return belongsToUnboundNode;
    })
    .map((data) => ({
      uploaded: true,
      updating: false,
      deleting: false,
      data,
    }));
}

function projectTemporary(attachment: StoredTemporaryAttachment): TemporaryAttachment {
  return {
    ...attachment,
    updating: false,
    deleting: false,
  };
}

function applyMutationState(
  attachments: UploadedAttachment[],
  nodeId: string,
  pendingMutations: PendingAttachmentMutation[],
) {
  for (const attachment of attachments) {
    attachment.updating = pendingMutations.some(
      (mutation) =>
        mutation.type === 'update' && mutation.nodeId === nodeId && mutation.dataElementId === attachment.data.id,
    );
    attachment.deleting = pendingMutations.some(
      (mutation) =>
        mutation.type === 'remove' && mutation.nodeId === nodeId && mutation.dataElementId === attachment.data.id,
    );
  }
}

/**
 * Merges canonical uploaded files with local upload placeholders at the
 * selector boundary. Backend attachment data is never persisted in FormStore.
 */
export function attachmentSelector(
  node: AttachmentNode,
  state: FormStoreState,
  instanceData: IData[],
  application: ApplicationMetadata,
  taskId?: string,
  pendingMutations: PendingAttachmentMutation[] = [],
): IAttachment[] {
  const uploaded = selectUploadedAttachments(node, state, instanceData, application, taskId);
  applyMutationState(uploaded, node.id, pendingMutations);
  const temporary = Object.values(state.attachments.temporary[node.id] ?? {}).map(projectTemporary);
  return [...uploaded, ...temporary].sort(sortAttachmentsByName);
}
