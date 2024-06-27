import type { AxiosError } from 'axios';

import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type FileUploaderNode = LayoutNode<'FileUpload' | 'FileUploadWithTag'>;

export interface AttachmentActionUpload {
  action: 'upload';
  file: File;
  node: FileUploaderNode;
}

export interface AttachmentActionUpdate {
  action: 'update';
  tags: string[];
  node: FileUploaderNode;
  attachment: UploadedAttachment;
}

export interface AttachmentActionRemove {
  action: 'remove';
  node: FileUploaderNode;
  attachment: UploadedAttachment;
}

export type RawAttachmentAction<T extends AttachmentActionUpload | AttachmentActionUpdate | AttachmentActionRemove> =
  Omit<T, 'action'>;

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

export type UploadedAttachment = { uploaded: true; data: IData } & Metadata;
export type TemporaryAttachment = { uploaded: false; data: IAttachmentTemporary } & Metadata;
export type IAttachment = UploadedAttachment | TemporaryAttachment;

export interface IAttachments<T extends IAttachment = IAttachment> {
  [attachmentComponentId: string]: T[] | undefined;
}

export function isAttachmentUploaded(attachment: IAttachment): attachment is UploadedAttachment {
  return attachment.uploaded;
}
