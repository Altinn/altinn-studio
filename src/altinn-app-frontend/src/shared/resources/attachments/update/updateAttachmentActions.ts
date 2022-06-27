import { Action } from 'redux';
import { IAttachment } from '..';
import * as ActionTypes from '../attachmentActionTypes';

export interface IUpdateAttachmentAction extends Action {
  attachment: IAttachment;
  componentId: string;
  baseComponentId: string;
  tag: string;
}

export interface IUpdateAttachmentActionFulfilled extends Action {
  attachment: IAttachment;
  componentId: string;
  baseComponentId: string;
}

export interface IUpdateAttachmentActionRejected extends Action {
  attachment: IAttachment;
  componentId: string;
  baseComponentId: string;
  tag: string;
}

export function updateAttachment(
  attachment: IAttachment,
  componentId: string,
  baseComponentId: string,
  tag: string,
): IUpdateAttachmentAction {
  return {
    type: ActionTypes.UPDATE_ATTACHMENT,
    attachment,
    componentId,
    baseComponentId,
    tag,
  };
}

export function updateAttachmentFulfilled(
  attachment: IAttachment,
  componentId: string,
  baseComponentId: string,
): IUpdateAttachmentActionFulfilled {
  return {
    type: ActionTypes.UPDATE_ATTACHMENT_FULFILLED,
    attachment,
    componentId,
    baseComponentId,
  };
}

export function updateAttachmentRejected(
  attachment: IAttachment,
  componentId: string,
  baseComponentId: string,
  tag: string,
): IUpdateAttachmentActionRejected {
  return {
    type: ActionTypes.UPDATE_ATTACHMENT_REJECTED,
    attachment,
    componentId,
    baseComponentId,
    tag,
  };
}
