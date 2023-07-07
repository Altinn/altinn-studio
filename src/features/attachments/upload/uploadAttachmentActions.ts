import type { IAttachment } from 'src/features/attachments';
import type { IDataModelBindings } from 'src/layout/layout';

export interface IUploadAttachmentAction {
  file: File;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
  dataModelBindings?: IDataModelBindings<'FileUpload' | 'FileUploadWithTag'>;
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
