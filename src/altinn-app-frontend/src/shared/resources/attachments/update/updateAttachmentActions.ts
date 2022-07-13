import type { IAttachment } from '..';

export interface IUpdateAttachmentAction {
  attachment: IAttachment;
  componentId: string;
  baseComponentId: string;
  tag: string;
}

export interface IUpdateAttachmentActionFulfilled {
  attachment: IAttachment;
  componentId: string;
  baseComponentId: string;
}

export interface IUpdateAttachmentActionRejected {
  attachment: IAttachment;
  componentId: string;
  baseComponentId: string;
  tag: string;
}
