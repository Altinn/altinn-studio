import type { IAttachments } from '..';

export interface IMapAttachmentsActionFulfilled {
  attachments: IAttachments;
}

export interface IMapAttachmentsActionRejected {
  error: Error;
}
