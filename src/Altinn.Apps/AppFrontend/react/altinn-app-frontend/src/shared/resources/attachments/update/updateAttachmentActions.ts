import { Action } from 'redux';
import { IAttachment } from '..';
import * as ActionTypes from '../attachmentActionTypes';

export interface IUpdateAttachmentAction extends Action {
  attachment: IAttachment;
  attachmentType: string;
  tag: string;
}

export interface IUpdateAttachmentActionFulfilled extends Action {
  attachment: IAttachment;
  attachmentType: string;
}

export interface IUpdateAttachmentActionRejected extends Action {
  attachment: IAttachment;
  attachmentType: string;
  tag: string;
}

export function updateAttachment(
  attachment: IAttachment,
  attachmentType: string,
  tag: string,
): IUpdateAttachmentAction {
  return {
    type: ActionTypes.UPDATE_ATTACHMENT,
    attachment,
    attachmentType,
    tag,
  };
}

export function updateAttachmentFulfilled(
  attachment: IAttachment,
  attachmentType: string,
): IUpdateAttachmentActionFulfilled {
  return {
    type: ActionTypes.UPDATE_ATTACHMENT_FULFILLED,
    attachment,
    attachmentType,
  };
}

export function updateAttachmentRejected(
  attachment: IAttachment,
  attachmentType: string,
  tag: string,
): IUpdateAttachmentActionRejected {
  return {
    type: ActionTypes.UPDATE_ATTACHMENT_REJECTED,
    attachment,
    attachmentType,
    tag,
  };
}
