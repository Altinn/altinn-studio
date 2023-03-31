import type { IAttachments } from 'src/features/attachments';

export interface IMapAttachmentsActionFulfilled {
  attachments: IAttachments;
}

export interface IMapAttachmentsActionRejected {
  error: Error;
}
