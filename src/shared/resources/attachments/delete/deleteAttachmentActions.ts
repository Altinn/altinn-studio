import type { IDataModelBindings } from 'src/layout/layout';
import type { IAttachment } from 'src/shared/resources/attachments';

export interface IDeleteAttachmentAction {
  attachment: IAttachment;
  attachmentType: string;
  componentId: string;
  dataModelBindings: IDataModelBindings | undefined;
}

export interface IDeleteAttachmentActionFulfilled {
  attachmentId: string;
  attachmentType: string;
  componentId: string;
}

export interface IDeleteAttachmentActionRejected {
  attachment: IAttachment;
  attachmentType: string;
  componentId: string;
}
