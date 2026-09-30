import type { IFailedAttachment, StoredTemporaryAttachment } from 'src/features/attachments';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';

export type AttachmentUploadResult =
  | {
      temporaryId: string;
      newDataElementId: string;
    }
  | {
      temporaryId: string;
      error: Error;
    };

export interface AttachmentActionUpload {
  files: {
    temporaryId: string;
    file: File;
  }[];
  nodeId: string;
}

export interface AttachmentActionAddFailed {
  nodeId: string;
  attachments: IFailedAttachment[];
}

export interface AttachmentsSliceState {
  temporary: Record<string, Record<string, StoredTemporaryAttachment> | undefined>;
  failed: Record<string, Record<string, IFailedAttachment> | undefined>;
  addTemporaryAttachments: (action: AttachmentActionUpload) => void;
  finishAttachmentUploads: (action: AttachmentActionUpload, results: AttachmentUploadResult[]) => void;
  deleteFailedAttachment: (nodeId: string, temporaryId: string) => void;
  addFailedAttachments: (action: AttachmentActionAddFailed) => void;
}

function isFailedUpload(result: AttachmentUploadResult): result is Extract<AttachmentUploadResult, { error: Error }> {
  return 'error' in result;
}

export function createAttachmentsSlice(set: FormStoreSet): FormStoreState['attachments'] {
  return {
    temporary: {},
    failed: {},
    addTemporaryAttachments: ({ files, nodeId }) =>
      set((state) => {
        const temporary = (state.attachments.temporary[nodeId] ??= {});
        for (const { file, temporaryId } of files) {
          temporary[temporaryId] = {
            uploaded: false,
            data: {
              temporaryId,
              filename: file.name,
              size: file.size,
            },
          };
        }
      }),
    finishAttachmentUploads: ({ nodeId }, results) =>
      set((state) => {
        const temporary = state.attachments.temporary[nodeId];
        for (const result of results) {
          const attachment = temporary?.[result.temporaryId];
          if (attachment && isFailedUpload(result)) {
            const failed = (state.attachments.failed[nodeId] ??= {});
            failed[result.temporaryId] = {
              data: attachment.data,
              error: result.error,
            };
          }
          if (temporary) {
            delete temporary[result.temporaryId];
          }
        }
        if (temporary && Object.keys(temporary).length === 0) {
          delete state.attachments.temporary[nodeId];
        }
      }),
    deleteFailedAttachment: (nodeId, temporaryId) =>
      set((state) => {
        const failed = state.attachments.failed[nodeId];
        if (!failed) {
          return;
        }
        delete failed[temporaryId];
        if (Object.keys(failed).length === 0) {
          delete state.attachments.failed[nodeId];
        }
      }),
    addFailedAttachments: ({ nodeId, attachments }) =>
      set((state) => {
        const failed = (state.attachments.failed[nodeId] ??= {});
        for (const attachment of attachments) {
          failed[attachment.data.temporaryId] = attachment;
        }
      }),
  };
}
