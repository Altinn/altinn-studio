import type { IDataModelPairResponse } from 'src/features/formData/types';
import type { BackendValidationIssue, BackendValidationIssuesWithSource } from 'src/features/validation';
import type { IData, IInstance, ProblemDetails } from 'src/types/shared';

export interface IAttachmentTemporary {
  temporaryId: string;
  filename: string;
  size: number;
  tags?: string[];
}

interface AttachmentMutationState {
  updating: boolean;
  deleting: boolean;
}

export type StoredTemporaryAttachment = { uploaded: false; data: IAttachmentTemporary };
export type UploadedAttachment = { uploaded: true; data: IData } & AttachmentMutationState;
export type TemporaryAttachment = StoredTemporaryAttachment & AttachmentMutationState;
export type IAttachment = UploadedAttachment | TemporaryAttachment;
export type IFailedAttachment = { data: IAttachmentTemporary; error: Error };

export interface IAttachmentsMap<T extends IAttachment = IAttachment> {
  [attachmentComponentId: string]: T[] | undefined;
}

export function isAttachmentUploaded(attachment: IAttachment): attachment is UploadedAttachment {
  return attachment.uploaded;
}

export type DataPostResponse = {
  newDataElementId: string;
  instance: IInstance;
  validationIssues: BackendValidationIssuesWithSource[];
  newDataModels: IDataModelPairResponse[];
};

export type DataPostErrorResponse = ProblemDetails & {
  uploadValidationIssues: BackendValidationIssue[];
};

export function isDataPostError(error: unknown): error is DataPostErrorResponse {
  return (
    typeof error === 'object' &&
    error != null &&
    !Array.isArray(error) &&
    'uploadValidationIssues' in error &&
    Array.isArray(error.uploadValidationIssues)
  );
}
