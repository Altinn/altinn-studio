import type { IAttachments } from 'src/shared/resources/attachments';

export interface IMapAttachmentsActionFulfilled {
  attachments: IAttachments;
}

export interface IMapAttachmentsActionRejected {
  error: Error;
}
