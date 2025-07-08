import type { AxiosError } from 'axios';

import type { IDataModelPairResponse } from 'src/features/formData/types';
import type { BackendValidationIssue, BackendValidationIssueGroupListItem } from 'src/features/validation';
import type { IData, IInstance, ProblemDetails } from 'src/types/shared';

interface IAttachmentTemporary {
  temporaryId: string;
  filename: string;
  size: number;
  tags?: string[];
}

interface Metadata {
  updating: boolean;
  deleting: boolean;
  error?: AxiosError;
}

export type UploadedAttachment = { uploaded: true; data: IData; temporaryId?: string } & Metadata;
export type TemporaryAttachment = { uploaded: false; data: IAttachmentTemporary } & Metadata;
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
  validationIssues: BackendValidationIssueGroupListItem[];
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
