import { sortAttachmentsByName } from 'src/features/attachments/sortAttachments';
import type { IAttachment } from 'src/features/attachments/index';
import type { FormStoreState } from 'src/features/form/FormContext';

const emptyArray = [];

export type AttachmentsSelector = (nodeId: string) => IAttachment[];
export const attachmentSelector = (nodeId: string) => (state: FormStoreState) => {
  const nodeData = state.nodes.nodeData[nodeId];
  if (!nodeData) {
    return emptyArray;
  }
  if (nodeData && 'attachments' in nodeData) {
    return Object.values(nodeData.attachments).sort(sortAttachmentsByName);
  }
  return emptyArray;
};
