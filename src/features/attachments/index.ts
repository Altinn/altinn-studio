import type { AxiosError } from 'axios';

import type { CompWithBehavior } from 'src/layout/layout';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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

export interface IAttachmentsMap<T extends IAttachment = IAttachment> {
  [attachmentComponentId: string]: T[] | undefined;
}

export function isAttachmentUploaded(attachment: IAttachment): attachment is UploadedAttachment {
  return attachment.uploaded;
}

export type FileUploaderNode = LayoutNode<CompWithBehavior<'canHaveAttachments'>>;
