import type { IAttachment } from 'src/shared/resources/attachments';
import type { IDataModelBindings } from 'src/types';

export interface IUploadAttachmentAction {
  file: File;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
  dataModelBindings?: IDataModelBindings;
  index: number;
}

export interface IUploadAttachmentActionFulfilled {
  attachment: IAttachment;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
}

export interface IUploadAttachmentActionRejected {
  attachmentId: string;
  attachmentType: string;
  componentId: string;
}
