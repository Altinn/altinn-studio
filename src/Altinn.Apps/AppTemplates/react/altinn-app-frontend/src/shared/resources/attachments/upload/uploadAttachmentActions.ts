import { Action } from 'redux';
import { IAttachment } from '..';
import * as ActionTypes from '../attachmentActionTypes';

export interface IUploadAttachmentAction extends Action {
  file: File;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
}

export interface IUploadAttachmentActionFulfilled extends Action {
  attachment: IAttachment;
  attachmentType: string;
  tmpAttachmentId: string;
  componentId: string;
}

export interface IUploadAttachmentActionRejected extends Action {
  attachmentId: string;
  attachmentType: string;
  componentId: string;
}

export function uploadAttachment(
  file: File,
  attachmentType: string,
  tmpAttachmentId: string,
  componentId: string,
): IUploadAttachmentAction {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT,
    file,
    attachmentType,
    tmpAttachmentId,
    componentId,
  };
}

export function uploadAttachmentFulfilled(
  attachment: IAttachment,
  attachmentType: string,
  tmpAttachmentId: string,
  componentId: string,
): IUploadAttachmentActionFulfilled {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT_FULFILLED,
    attachment,
    attachmentType,
    tmpAttachmentId,
    componentId,
  };
}

export function uploadAttachmentRejected(
  attachmentId: string,
  attachmentType: string,
  componentId: string,
): IUploadAttachmentActionRejected {
  return {
    type: ActionTypes.UPLOAD_ATTACHMENT_REJECTED,
    attachmentId,
    attachmentType,
    componentId,
  };
}
